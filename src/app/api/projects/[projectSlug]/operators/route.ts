import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import {
  requireProjectOperator,
  requireAdminProjectOperator,
} from '@/server/auth/permissions'
import {
  createProjectOperator,
  listProjectOperators,
} from '@/server/services/project-operator'

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

const createOperatorSchema = z.object({
  name: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireAdminProjectOperator(projectSlug)

    const body = await request.json()
    const parsed = createOperatorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const result = await createProjectOperator({
      projectId: project.id,
      name: parsed.data.name,
      type: 'bot',
      role: 'member',
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return mapApiError(error)
  }
}
