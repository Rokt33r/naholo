import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireProjectWorker } from '@/server/auth/permissions'
import { listIssues, createIssue } from '@/server/services/issue'

type RouteContext = {
  params: Promise<{
    projectSlug: string
  }>
}

/**
 * GET /api/projects/[projectSlug]/issues
 * List issues for a project
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params
    const { project } = await requireProjectWorker(projectSlug)

    const searchParams = request.nextUrl.searchParams
    const closed = searchParams.get('closed') === 'true'

    const issues = await listIssues({ projectId: project.id, closed })

    return NextResponse.json(issues)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
})

/**
 * POST /api/projects/[projectSlug]/issues
 * Create a new issue
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createIssueSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { title } = validation.data

    const { projectWorker, project } = await requireProjectWorker(projectSlug)

    const result = await createIssue({
      projectWorkerId: projectWorker.id,
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
