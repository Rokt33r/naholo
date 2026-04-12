import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueTaskAccess } from '@/server/auth/permissions'
import {
  updateTask,
  updateTaskNote,
  setTaskDone,
  deleteTask,
} from '@/server/services/task'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    issueNumber: string
    taskId: string
  }>
}

const updateTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').trim().optional(),
  note: z.string().trim().nullable().optional(),
  done: z.boolean().optional(),
})

/**
 * PATCH /api/projects/[projectId]/issues/[issueNumber]/tasks/[taskId]
 * Update a task
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber, taskId } = await context.params
    const { projectWorker, issue } = await requireIssueTaskAccess(
      projectSlug,
      issueNumber,
      taskId,
    )

    let body
    try {
      body = await request.json()
    } catch (error) {
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
      const result = await updateTask({
        projectWorkerId: projectWorker.id,
        issueId: issue.id,
        taskId,
        name,
      })
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 404 },
        )
      }
    }

    // Handle note update
    if (note !== undefined) {
      const result = await updateTaskNote({
        projectWorkerId: projectWorker.id,
        issueId: issue.id,
        taskId,
        note,
      })
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 404 },
        )
      }
    }

    // Handle done status update
    if (done !== undefined) {
      const result = await setTaskDone({
        projectWorkerId: projectWorker.id,
        issueId: issue.id,
        taskId,
        done,
      })
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
 * DELETE /api/projects/[projectId]/issues/[issueNumber]/tasks/[taskId]
 * Delete a task
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber, taskId } = await context.params
    const { projectWorker, issue } = await requireIssueTaskAccess(
      projectSlug,
      issueNumber,
      taskId,
    )

    const result = await deleteTask({
      projectWorkerId: projectWorker.id,
      issueId: issue.id,
      taskId,
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
