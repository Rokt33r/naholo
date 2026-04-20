import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOperationLogAccess } from '@/server/auth/permissions'
import {
  updateOperationLog,
  deleteOperationLog,
} from '@/server/services/operation-log'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
    logId: string
  }>
}

const updateOperationLogSchema = z.object({
  content: z.string().min(1, 'Content is required').trim(),
})

/**
 * PATCH /api/projects/[projectSlug]/operations/[operationNumber]/operation-logs/[logId]
 * Update an operation log
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, logId } = await context.params
    const { projectOperator, operation } = await requireOperationLogAccess(
      projectSlug,
      operationNumber,
      logId,
    )

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = updateOperationLogSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { content } = validation.data

    const result = await updateOperationLog({
      projectOperatorId: projectOperator.id,
      operationId: operation.id,
      logId,
      content,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    const log = result.data
    return NextResponse.json({
      id: log.id,
      content: log.content,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/projects/[projectSlug]/operations/[operationNumber]/operation-logs/[logId]
 * Delete an operation log
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, logId } = await context.params
    const { projectOperator, operation } = await requireOperationLogAccess(
      projectSlug,
      operationNumber,
      logId,
    )

    const result = await deleteOperationLog({
      projectOperatorId: projectOperator.id,
      operationId: operation.id,
      logId,
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
