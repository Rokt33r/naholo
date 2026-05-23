import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import {
  requireAdminProjectOperator,
  requireProjectOperator,
} from '@/server/auth/permissions'
import {
  deleteProjectOperator,
  getProjectOperator,
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; operatorId: string }> },
) {
  try {
    const { projectSlug, operatorId } = await params
    const { project } = await requireAdminProjectOperator(projectSlug)

    const { deleted } = await deleteProjectOperator(operatorId, project.id)
    if (!deleted) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return mapApiError(error)
  }
}
