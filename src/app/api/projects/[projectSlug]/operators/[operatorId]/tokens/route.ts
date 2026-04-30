import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import { getProjectOperator } from '@/server/services/project-operator'
import {
  listProjectOperatorApiTokens,
  createProjectOperatorApiToken,
} from '@/server/services/project-operator-api-token'

type RouteContext = {
  params: Promise<{ projectSlug: string; operatorId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { projectSlug, operatorId } = await params
    const { project } = await requireProjectOperator(projectSlug)

    const operator = await getProjectOperator(operatorId, project.id)
    if (operator == null) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    const tokens = await listProjectOperatorApiTokens(operatorId)

    return NextResponse.json(tokens)
  } catch (error) {
    return mapApiError(error)
  }
}

const createTokenSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
})

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { projectSlug, operatorId } = await params
    const { project } = await requireProjectOperator(projectSlug)

    const operator = await getProjectOperator(operatorId, project.id)
    if (operator == null) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = createTokenSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await createProjectOperatorApiToken(operatorId, {
      name: validation.data.name,
    })

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    return mapApiError(error)
  }
}
