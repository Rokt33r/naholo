import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
import {
  updateTask,
  updateTaskNote,
  setTaskDone,
  deleteTask,
} from '@/server/services/task'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueId: string
    taskId: string
  }>
}

const updateTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').trim().optional(),
  note: z.string().trim().nullable().optional(),
  done: z.boolean().optional(),
})

/**
 * PATCH /api/projects/[projectId]/issues/[issueId]/tasks/[taskId]
 * Update a task
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const validation = updateTaskSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, note, done } = validation.data

    // Handle name update
    if (name !== undefined) {
      const result = await updateTask(user.id, issueId, taskId, name)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 404 },
        )
      }
    }

    // Handle note update
    if (note !== undefined) {
      const result = await updateTaskNote(user.id, issueId, taskId, note)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 404 },
        )
      }
    }

    // Handle done status update
    if (done !== undefined) {
      const result = await setTaskDone(user.id, issueId, taskId, done)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 404 },
        )
      }
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

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]/tasks/[taskId]
 * Delete a task
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { issueId, taskId } = await context.params

    const result = await deleteTask(user.id, issueId, taskId)

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
