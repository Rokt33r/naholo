import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import {
  requireProjectOperator,
  requireAdminProjectOperator,
} from '@/server/auth/permissions'
import {
  getProjectOperator,
  updateProjectOperator,
} from '@/server/services/project-operator'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; operatorId: string }> },
) {
  try {
    const { projectSlug, operatorId } = await params
    const { project } = await requireProjectOperator(projectSlug)

    const operator = await getProjectOperator(operatorId, project.id)

    if (operator == null) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    return NextResponse.json(operator)
  } catch (error) {
    return mapApiError(error)
  }
}

const updateOperatorSchema = z.object({
  soul: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; operatorId: string }> },
) {
  try {
    const { projectSlug, operatorId } = await params
    const { project } = await requireAdminProjectOperator(projectSlug)

    const body = await request.json()
    const parsed = updateOperatorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const updated = await updateProjectOperator(
      operatorId,
      project.id,
      parsed.data,
    )
    if (updated == null) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    return mapApiError(error)
  }
}
