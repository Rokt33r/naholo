import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueAccess } from '@/server/auth/permissions'
import {
  listTasks,
  createTask,
  syncTasks,
  type SyncTaskNode,
} from '@/server/services/task'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    issueNumber: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/issues/[issueNumber]/tasks
 * List tasks for an issue
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber } = await context.params
    const { issue } = await requireIssueAccess(projectSlug, issueNumber)

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
 * POST /api/projects/[projectSlug]/issues/[issueNumber]/tasks
 * Create a new task
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber } = await context.params

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

    const { projectWorker, project, issue } = await requireIssueAccess(
      projectSlug,
      issueNumber,
    )

    const result = await createTask({
      projectWorkerId: projectWorker.id,
      projectId: project.id,
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

const syncTaskNodeSchema: z.ZodType<SyncTaskNode> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    name: z.string().min(1).trim(),
    done: z.boolean().optional(),
    childTasks: z.array(syncTaskNodeSchema).optional(),
  }),
)

const syncTasksSchema = z.object({
  tasks: z.array(syncTaskNodeSchema),
  taskIdsToDelete: z.array(z.string()).optional(),
})

/**
 * PUT /api/projects/[projectSlug]/issues/[issueNumber]/tasks
 * Sync the full task tree for an issue
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = syncTasksSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { tasks: taskNodes, taskIdsToDelete } = validation.data

    const { projectWorker, project, issue } = await requireIssueAccess(
      projectSlug,
      issueNumber,
    )

    const result = await syncTasks({
      projectWorkerId: projectWorker.id,
      projectId: project.id,
      issueId: issue.id,
      tasks: taskNodes,
      taskIdsToDelete: taskIdsToDelete ?? [],
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
