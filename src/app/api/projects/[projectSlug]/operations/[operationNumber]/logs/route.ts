import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOperationAccess } from '@/server/auth/permissions'
import {
  listOperationLogs,
  createOperationLog,
} from '@/server/services/operation-log'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/operations/[operationNumber]/logs
 * List logs for an operation
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const logs = await listOperationLogs({ operationId: operation.id })

    return NextResponse.json(logs)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createOperationLogSchema = z.object({
  content: z.string().min(1, 'Content is required').trim(),
})

/**
 * POST /api/projects/[projectSlug]/operations/[operationNumber]/logs
 * Create a new operation log
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

    const validation = createOperationLogSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { content } = validation.data

    const { projectOperator, project, operation } =
      await requireOperationAccess(projectSlug, operationNumber)

    const result = await createOperationLog({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      operationId: operation.id,
      content,
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
