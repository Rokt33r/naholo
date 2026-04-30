import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationNoteAccess } from '@/server/auth/permissions'
import { updateNote, deleteNote } from '@/server/services/note'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
    noteName: string
  }>
}

const updateNoteSchema = z.object({
  name: z.string().min(1, 'Name is required').trim().optional(),
  content: z.string().trim().optional(),
})

/**
 * PATCH /api/projects/[projectSlug]/operations/[operationNumber]/notes/[noteName]
 * Update a note
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, noteName } = await context.params
    const { projectOperator, operation } = await requireOperationNoteAccess(
      projectSlug,
      operationNumber,
      noteName,
    )

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = updateNoteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, content } = validation.data

    const sourceClientId = getSourceClientId(request)

    const result = await updateNote({
      projectOperatorId: projectOperator.id,
      noteName,
      operationId: operation.id,
      name,
      content,
      sourceClientId,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    return mapApiError(error)
  }
}

/**
 * DELETE /api/projects/[projectSlug]/operations/[operationNumber]/notes/[noteName]
 * Delete a note
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, noteName } = await context.params
    const { projectOperator, operation } = await requireOperationNoteAccess(
      projectSlug,
      operationNumber,
      noteName,
    )

    const sourceClientId = getSourceClientId(request)

    const result = await deleteNote({
      projectOperatorId: projectOperator.id,
      noteName,
      operationId: operation.id,
      sourceClientId,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}
