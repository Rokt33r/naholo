import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { deleteProjectOperator } from '@/server/services/project-operator'

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
