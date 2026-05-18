import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import { listProjectOperators } from '@/server/services/project-operator'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireProjectOperator(projectSlug)

    const operators = await listProjectOperators(project.id)

    return NextResponse.json(operators)
  } catch (error) {
    return mapApiError(error)
  }
}
