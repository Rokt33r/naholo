import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import {
  createOperationAssignees,
  deleteOperationAssignees,
} from '@/server/services/assignee'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

const operationAssigneesBodySchema = z.object({
  targets: z.array(z.union([z.literal('self'), z.uuid()])),
})

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { project, operation, projectOperator } =
      await requireOperationAccess(projectSlug, operationNumber)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = operationAssigneesBodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await createOperationAssignees({
      projectId: project.id,
      operationId: operation.id,
      projectOperatorIds: resolveAssigneeOperatorIds(
        validation.data.targets,
        projectOperator.id,
      ),
      sourceClientId: getSourceClientId(request),
    })

    if (!result.success) {
      return mapApiError(result.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { project, operation, projectOperator } =
      await requireOperationAccess(projectSlug, operationNumber)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = operationAssigneesBodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await deleteOperationAssignees({
      projectId: project.id,
      operationId: operation.id,
      projectOperatorIds: resolveAssigneeOperatorIds(
        validation.data.targets,
        projectOperator.id,
      ),
      sourceClientId: getSourceClientId(request),
    })

    if (!result.success) {
      return mapApiError(result.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}

function resolveAssigneeOperatorIds(
  targets: ('self' | string)[],
  selfOperatorId: string,
): string[] {
  return Array.from(
    new Set(
      targets.map((target) => (target === 'self' ? selfOperatorId : target)),
    ),
  )
}
