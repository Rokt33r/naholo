import { NextRequest, NextResponse } from 'next/server'
import { requireProjectWorker } from '@/server/auth/utils'
import { getProjectById } from '@/server/services/project'

type RouteContext = {
  params: Promise<{
    projectId: string
  }>
}

/**
 * GET /api/projects/[projectId]
 * Get a single project
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectId } = await context.params
    await requireProjectWorker(projectId)

    const project = await getProjectById(projectId)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
