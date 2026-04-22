import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOperationAccess } from '@/server/auth/permissions'
import {
  listObjectives,
  createObjective,
  syncObjectives,
  type SyncObjectiveNode,
} from '@/server/services/objective'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/operations/[operationNumber]/objectives
 * List objectives for an operation
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const objectives = await listObjectives({ operationId: operation.id })

    return NextResponse.json(objectives)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createObjectiveSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  note: z.string().trim().nullable().optional(),
  parentObjectiveId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
})

/**
 * POST /api/projects/[projectSlug]/operations/[operationNumber]/objectives
 * Create a new objective
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createObjectiveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, note, parentObjectiveId, position } = validation.data

    const { projectOperator, project, operation } =
      await requireOperationAccess(projectSlug, operationNumber)

    const sourceClientId = getSourceClientId(request)

    const result = await createObjective({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      operationId: operation.id,
      name,
      note,
      parentObjectiveId,
      position,
      sourceClientId,
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

const syncObjectiveNodeSchema: z.ZodType<SyncObjectiveNode> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    name: z.string().min(1).trim(),
    done: z.boolean().optional(),
    childObjectives: z.array(syncObjectiveNodeSchema).optional(),
  }),
)

const syncObjectivesSchema = z.object({
  objectives: z.array(syncObjectiveNodeSchema),
  objectiveIdsToDelete: z.array(z.string()).optional(),
})

/**
 * PUT /api/projects/[projectSlug]/operations/[operationNumber]/objectives
 * Sync the full objective tree for an operation
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = syncObjectivesSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { objectives: objectiveNodes, objectiveIdsToDelete } = validation.data

    const { projectOperator, project, operation } =
      await requireOperationAccess(projectSlug, operationNumber)

    const sourceClientId = getSourceClientId(request)

    const result = await syncObjectives({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      operationId: operation.id,
      objectives: objectiveNodes,
      objectiveIdsToDelete: objectiveIdsToDelete ?? [],
      sourceClientId,
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
