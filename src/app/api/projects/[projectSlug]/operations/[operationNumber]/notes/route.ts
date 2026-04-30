import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import { listNotes, createNote } from '@/server/services/note'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/operations/[operationNumber]/notes
 * List notes for an operation
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const notes = await listNotes({ operationId: operation.id })

    return NextResponse.json(notes)
  } catch (error) {
    return mapApiError(error)
  }
}

const createNoteSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  content: z.string().trim(),
})

/**
 * POST /api/projects/[projectSlug]/operations/[operationNumber]/notes
 * Create a new note
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createNoteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, content } = validation.data

    const { projectOperator, project, operation } =
      await requireOperationAccess(projectSlug, operationNumber)

    const sourceClientId = getSourceClientId(request)

    const result = await createNote({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      operationId: operation.id,
      name,
      content,
      sourceClientId,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    return mapApiError(error)
  }
}
