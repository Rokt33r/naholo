import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireProjectOperator } from '@/server/auth/permissions'
import { listOperations, createOperation } from '@/server/services/operation'

type RouteContext = {
  params: Promise<{
    projectSlug: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/operations
 * List operations for a project
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    const searchParams = request.nextUrl.searchParams
    const closed = searchParams.get('closed') === 'true'

    const operations = await listOperations({ projectId: project.id, closed })

    return NextResponse.json(operations)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createOperationSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
})

/**
 * POST /api/projects/[projectSlug]/operations
 * Create a new operation
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createOperationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { title } = validation.data

    const { projectOperator, project } =
      await requireProjectOperator(projectSlug)

    const result = await createOperation({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      title,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
