import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import { listOperations, createOperation } from '@/server/services/operation'
import { resolveProjectOperatorIds } from '@/server/services/assignee'
import { resolveProjectLabelIds } from '@/server/services/project-label'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/operations
 * List operations for a project
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    const searchParams = request.nextUrl.searchParams
    const closed = searchParams.get('closed') === 'true'

    const operations = await listOperations({ projectId: project.id, closed })

    return NextResponse.json(operations)
  } catch (error) {
    return mapApiError(error)
  }
}

const createOperationSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
})

/**
 * POST /api/projects/[projectSlug]/operations
 * Create a new operation
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createOperationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { title, assigneeIds, labelIds } = validation.data

    const { projectOperator, project } =
      await requireProjectOperator(projectSlug)

    const validAssigneeIds =
      assigneeIds != null
        ? await resolveProjectOperatorIds(project.id, assigneeIds)
        : []
    const validLabelIds =
      labelIds != null ? await resolveProjectLabelIds(project.id, labelIds) : []

    const sourceClientId = getSourceClientId(request)

    const result = await createOperation({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      title,
      assigneeIds: validAssigneeIds,
      labelIds: validLabelIds,
      sourceClientId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    return mapApiError(error)
  }
}
