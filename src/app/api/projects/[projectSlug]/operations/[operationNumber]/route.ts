import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import {
  getOperation,
  updateOperation,
  deleteOperation,
} from '@/server/services/operation'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/operations/[operationNumber]
 * Get a single operation
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { project, operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const result = await getOperation({
      projectId: project.id,
      operationNumber: operation.number,
    })

    if (result == null) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 },
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    return mapApiError(error)
  }
}

const updateOperationSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
})

/**
 * PATCH /api/projects/[projectSlug]/operations/[operationNumber]
 * Update operation title
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const validation = updateOperationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { title } = validation.data

    const sourceClientId = getSourceClientId(request)

    const result = await updateOperation({
      projectId: project.id,
      operationNumber: operation.number,
      title,
      sourceClientId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}

/**
 * DELETE /api/projects/[projectSlug]/operations/[operationNumber]
 * Delete an operation
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { project, operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const sourceClientId = getSourceClientId(request)

    const result = await deleteOperation({
      projectId: project.id,
      operationNumber: operation.number,
      sourceClientId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}
