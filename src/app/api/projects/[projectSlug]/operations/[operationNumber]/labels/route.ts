import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import {
  createOperationProjectLabels,
  deleteOperationProjectLabels,
} from '@/server/services/project-label'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

const operationProjectLabelsBodySchema = z.object({
  targets: z.array(z.uuid()),
})

/**
 * POST /api/projects/[projectSlug]/operations/[operationNumber]/labels
 * Attach labels to the operation.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { project, operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = operationProjectLabelsBodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await createOperationProjectLabels({
      projectId: project.id,
      operationId: operation.id,
      projectLabelIds: validation.data.targets,
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

/**
 * DELETE /api/projects/[projectSlug]/operations/[operationNumber]/labels
 * Detach labels from the operation.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { project, operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = operationProjectLabelsBodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await deleteOperationProjectLabels({
      projectId: project.id,
      operationId: operation.id,
      projectLabelIds: validation.data.targets,
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
