import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import {
  attachOperationLabel,
  detachOperationLabel,
} from '@/server/services/project-label'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

const operationLabelSchema = z.object({
  labelId: z.uuid(),
})

/**
 * POST /api/projects/[projectSlug]/operations/[operationNumber]/labels
 * Attach a label to the operation.
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

    const validation = operationLabelSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await attachOperationLabel({
      projectId: project.id,
      operationId: operation.id,
      projectLabelId: validation.data.labelId,
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
 * Detach a label from the operation.
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

    const validation = operationLabelSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await detachOperationLabel({
      projectId: project.id,
      operationId: operation.id,
      projectLabelId: validation.data.labelId,
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
