import { NextRequest, NextResponse } from 'next/server'
import { requireProjectOperator } from '@/server/auth/permissions'
import { getProjectOperator } from '@/server/services/project-operator'
import { revokeProjectOperatorApiToken } from '@/server/services/project-operator-api-token'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operatorId: string
    tokenId: string
  }>
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { projectSlug, operatorId, tokenId } = await params
    const { project } = await requireProjectOperator(projectSlug)

    const operator = await getProjectOperator(operatorId, project.id)
    if (operator == null) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    const result = await revokeProjectOperatorApiToken(operatorId, tokenId)

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
