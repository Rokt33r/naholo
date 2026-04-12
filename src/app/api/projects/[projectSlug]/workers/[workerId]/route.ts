import { NextRequest, NextResponse } from 'next/server'
import { requireProjectWorker } from '@/server/auth/permissions'
import { getProjectWorker } from '@/server/services/project-worker'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; workerId: string }> },
) {
  try {
    const { projectSlug, workerId } = await params
    const { project } = await requireProjectWorker(projectSlug)

    const worker = await getProjectWorker(workerId, project.id)

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    return NextResponse.json(worker)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
