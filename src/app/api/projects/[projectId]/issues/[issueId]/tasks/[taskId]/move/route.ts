import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
import { moveTask } from '@/server/services/task'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueId: string
    taskId: string
  }>
}

const moveTaskSchema = z.object({
  newParentTaskId: z.string().nullable(),
  newPosition: z.number().int().min(0),
})

/**
 * POST /api/projects/[projectId]/issues/[issueId]/tasks/[taskId]/move
 * Move a task to a new parent and/or position
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { issueId, taskId } = await context.params

    let body
    try {
      body = await request.json()
    } catch {
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

    const result = await moveTask(user.id, issueId, {
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
