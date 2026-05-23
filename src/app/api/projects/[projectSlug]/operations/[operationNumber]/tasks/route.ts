import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import {
  listTasks,
  createTask,
  syncTasks,
  type SyncTaskNode,
} from '@/server/services/task'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const tasks = await listTasks({ operationId: operation.id })

    return NextResponse.json(tasks)
  } catch (error) {
    return mapApiError(error)
  }
}

const createTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  note: z.string().trim().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params

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

    const { projectOperator, project, operation } =
      await requireOperationAccess(projectSlug, operationNumber)

    const sourceClientId = getSourceClientId(request)

    const result = await createTask({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      operationId: operation.id,
      name,
      note,
      parentTaskId,
      position,
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

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params

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

    const { projectOperator, project, operation } =
      await requireOperationAccess(projectSlug, operationNumber)

    const sourceClientId = getSourceClientId(request)

    const result = await syncTasks({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      operationId: operation.id,
      tasks: taskNodes,
      taskIdsToDelete: taskIdsToDelete ?? [],
      sourceClientId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    return mapApiError(error)
  }
}
