import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueTaskAccess } from '@/server/auth/permissions'
import { moveTask } from '@/server/services/task'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueNumber: string
    taskId: string
  }>
}

const moveTaskSchema = z.object({
  newParentTaskId: z.string().nullable(),
  newPosition: z.number().int().min(0),
})

/**
 * POST /api/projects/[projectId]/issues/[issueNumber]/tasks/[taskId]/move
 * Move a task to a new parent and/or position
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber, taskId } = await context.params
    const { projectWorker, issue } = await requireIssueTaskAccess(
      projectId,
      issueNumber,
      taskId,
    )

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

    const result = await moveTask({
      projectWorkerId: projectWorker.id,
      issueId: issue.id,
      taskId,
      newParentTaskId,
      newPosition,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
