import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueAccess } from '@/server/auth/permissions'
import { listTasks, createTask } from '@/server/services/task'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueNumber: string
  }>
}

/**
 * GET /api/projects/[projectId]/issues/[issueNumber]/tasks
 * List tasks for an issue
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params
    const { issue } = await requireIssueAccess(projectId, issueNumber)

    const tasks = await listTasks({ issueId: issue.id })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  note: z.string().trim().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
})

/**
 * POST /api/projects/[projectId]/issues/[issueNumber]/tasks
 * Create a new task
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createTaskSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, note, parentTaskId, position } = validation.data

    const { projectWorker, issue } = await requireIssueAccess(
      projectId,
      issueNumber,
    )

    const result = await createTask({
      projectWorkerId: projectWorker.id,
      projectId,
      issueId: issue.id,
      name,
      note,
      parentTaskId,
      position,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
