import { NextRequest, NextResponse } from 'next/server'
import { requireProjectWorker } from '@/server/auth/permissions'
import { listProjectWorkers } from '@/server/services/project-worker'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireProjectWorker(projectSlug)

    const workers = await listProjectWorkers(project.id)

    return NextResponse.json(workers)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
