import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOperationObjectiveAccess } from '@/server/auth/permissions'
import {
  updateObjective,
  updateObjectiveNote,
  setObjectiveDone,
  deleteObjective,
} from '@/server/services/objective'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
    objectiveId: string
  }>
}

const updateObjectiveSchema = z.object({
  name: z.string().min(1, 'Name is required').trim().optional(),
  note: z.string().trim().nullable().optional(),
  done: z.boolean().optional(),
})

/**
 * PATCH /api/projects/[projectSlug]/operations/[operationNumber]/objectives/[objectiveId]
 * Update an objective
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const validation = updateObjectiveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, note, done } = validation.data

    // Handle name update
    if (name !== undefined) {
      const result = await updateObjective({
        projectOperatorId: projectOperator.id,
        operationId: operation.id,
        objectiveId,
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
      const result = await updateObjectiveNote({
        projectOperatorId: projectOperator.id,
        operationId: operation.id,
        objectiveId,
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
      const result = await setObjectiveDone({
        projectOperatorId: projectOperator.id,
        operationId: operation.id,
        objectiveId,
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
 * DELETE /api/projects/[projectSlug]/operations/[operationNumber]/objectives/[objectiveId]
 * Delete an objective
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, objectiveId } = await context.params
    const { projectOperator, operation } =
      await requireOperationObjectiveAccess(
        projectSlug,
        operationNumber,
        objectiveId,
      )

    const result = await deleteObjective({
      projectOperatorId: projectOperator.id,
      operationId: operation.id,
      objectiveId,
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
