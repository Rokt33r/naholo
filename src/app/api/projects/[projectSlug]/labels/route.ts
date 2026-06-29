import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import {
  listProjectLabels,
  createProjectLabel,
} from '@/server/services/project-label'
import {
  projectLabelNameSchema,
  projectLabelColorSchema,
} from '@/lib/project-label'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireProjectOperator(projectSlug)

    const labels = await listProjectLabels(project.id)

    return NextResponse.json(labels)
  } catch (error) {
    return mapApiError(error)
  }
}

const createProjectLabelSchema = z.object({
  name: projectLabelNameSchema,
  color: projectLabelColorSchema,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireProjectOperator(projectSlug)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createProjectLabelSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await createProjectLabel({
      projectId: project.id,
      name: validation.data.name,
      color: validation.data.color,
    })

    if (!result.success) {
      return mapApiError(result.error)
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    return mapApiError(error)
  }
}
