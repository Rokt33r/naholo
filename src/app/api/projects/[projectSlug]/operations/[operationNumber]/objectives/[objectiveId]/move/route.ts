import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOperationObjectiveAccess } from '@/server/auth/permissions'
import { moveObjective } from '@/server/services/objective'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
    objectiveId: string
  }>
}

const moveObjectiveSchema = z.object({
  newParentObjectiveId: z.string().nullable(),
  newPosition: z.number().int().min(0),
})

/**
 * POST /api/projects/[projectSlug]/operations/[operationNumber]/objectives/[objectiveId]/move
 * Move an objective to a new parent and/or position
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, objectiveId } = await context.params
    const { projectOperator, operation } =
      await requireOperationObjectiveAccess(
        projectSlug,
        operationNumber,
        objectiveId,
      )

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = moveObjectiveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { newParentObjectiveId, newPosition } = validation.data

    const sourceClientId = getSourceClientId(request)

    const result = await moveObjective({
      projectOperatorId: projectOperator.id,
      operationId: operation.id,
      objectiveId,
      newParentObjectiveId,
      newPosition,
      sourceClientId,
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
