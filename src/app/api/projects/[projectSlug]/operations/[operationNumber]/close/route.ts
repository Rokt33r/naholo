import { NextRequest, NextResponse } from 'next/server'
import { requireOperationAccess } from '@/server/auth/permissions'
import { closeOperation, reopenOperation } from '@/server/services/operation'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

/**
 * POST /api/projects/[projectSlug]/operations/[operationNumber]/close
 * Close an operation
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { project, operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const sourceClientId = getSourceClientId(request)

    const result = await closeOperation({
      projectId: project.id,
      operationNumber: operation.number,
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

/**
 * DELETE /api/projects/[projectSlug]/operations/[operationNumber]/close
 * Reopen an operation
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { project, operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const sourceClientId = getSourceClientId(request)

    const result = await reopenOperation({
      projectId: project.id,
      operationNumber: operation.number,
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
