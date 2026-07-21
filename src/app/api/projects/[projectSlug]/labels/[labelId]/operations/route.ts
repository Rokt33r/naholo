import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError, NotFoundError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import {
  attachLabelToOperations,
  detachLabelFromOperations,
  isProjectLabelId,
} from '@/server/services/project-label'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    labelId: string
  }>
}

const bulkLabelOperationsBodySchema = z.object({
  opNumbers: z.array(z.number().int().positive()),
})

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, labelId } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = bulkLabelOperationsBodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    if (!(await isProjectLabelId(project.id, labelId))) {
      return mapApiError(new NotFoundError('Label'))
    }

    const { opNumbers } = await attachLabelToOperations({
      projectId: project.id,
      projectLabelId: labelId,
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
    const { projectSlug, labelId } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = bulkLabelOperationsBodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    if (!(await isProjectLabelId(project.id, labelId))) {
      return mapApiError(new NotFoundError('Label'))
    }

    const { opNumbers } = await detachLabelFromOperations({
      projectId: project.id,
      projectLabelId: labelId,
      operationNumbers: validation.data.opNumbers,
      sourceClientId: getSourceClientId(request),
    })

    return NextResponse.json({ opNumbers })
  } catch (error) {
    return mapApiError(error)
  }
}
