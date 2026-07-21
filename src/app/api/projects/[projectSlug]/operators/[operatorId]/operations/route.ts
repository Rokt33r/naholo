import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError, NotFoundError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import {
  assignOperatorToOperations,
  unassignOperatorFromOperations,
  isProjectOperatorId,
} from '@/server/services/assignee'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operatorId: string
  }>
}

const bulkOperatorOperationsBodySchema = z.object({
  opNumbers: z.array(z.number().int().positive()),
})

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operatorId } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = bulkOperatorOperationsBodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    if (!(await isProjectOperatorId(project.id, operatorId))) {
      return mapApiError(new NotFoundError('Operator'))
    }

    const { opNumbers } = await assignOperatorToOperations({
      projectId: project.id,
      projectOperatorId: operatorId,
      operationNumbers: validation.data.opNumbers,
      sourceClientId: getSourceClientId(request),
    })

    return NextResponse.json({ opNumbers })
  } catch (error) {
    return mapApiError(error)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operatorId } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = bulkOperatorOperationsBodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    if (!(await isProjectOperatorId(project.id, operatorId))) {
      return mapApiError(new NotFoundError('Operator'))
    }

    const { opNumbers } = await unassignOperatorFromOperations({
      projectId: project.id,
      projectOperatorId: operatorId,
      operationNumbers: validation.data.opNumbers,
      sourceClientId: getSourceClientId(request),
    })

    return NextResponse.json({ opNumbers })
  } catch (error) {
    return mapApiError(error)
  }
}
