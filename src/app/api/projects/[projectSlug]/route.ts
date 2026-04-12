import { NextRequest, NextResponse } from 'next/server'
import { requireProjectWorker } from '@/server/auth/permissions'
import { getProjectById } from '@/server/services/project'

type RouteContext = {
  params: Promise<{
    projectSlug: string
  }>
}

/**
 * GET /api/projects/[projectSlug]
 * Get a single project
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params
    const { project } = await requireProjectWorker(projectSlug)

    const result = await getProjectById(project.id)

    if (result == null) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
