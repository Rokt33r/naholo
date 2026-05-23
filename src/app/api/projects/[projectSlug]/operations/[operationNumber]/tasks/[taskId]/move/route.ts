import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationTaskAccess } from '@/server/auth/permissions'
import { moveTask } from '@/server/services/task'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
    taskId: string
  }>
}

const moveTaskSchema = z.object({
  newParentTaskId: z.string().nullable(),
  newPosition: z.number().int().min(0),
})

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, taskId } = await context.params
    const { projectOperator, project, operation } =
      await requireOperationTaskAccess(projectSlug, operationNumber, taskId)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = moveTaskSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { newParentTaskId, newPosition } = validation.data

    const sourceClientId = getSourceClientId(request)

    const result = await moveTask({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      operationId: operation.id,
      taskId,
      newParentTaskId,
      newPosition,
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
