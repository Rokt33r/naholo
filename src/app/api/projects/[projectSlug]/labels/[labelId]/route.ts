import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import {
  updateProjectLabel,
  deleteProjectLabel,
} from '@/server/services/project-label'
import {
  projectLabelNameSchema,
  projectLabelColorSchema,
} from '@/lib/project-label'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    labelId: string
  }>
}

const updateProjectLabelSchema = z
  .object({
    name: projectLabelNameSchema.optional(),
    color: projectLabelColorSchema.optional(),
  })
  .refine((data) => data.name != null || data.color != null, {
    message: 'Nothing to update',
  })

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, labelId } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = updateProjectLabelSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await updateProjectLabel({
      projectId: project.id,
      labelId,
      name: validation.data.name,
      color: validation.data.color,
    })

    if (!result.success) {
      return mapApiError(result.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, labelId } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    const result = await deleteProjectLabel({
      projectId: project.id,
      labelId,
    })

    if (!result.success) {
      return mapApiError(result.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}
