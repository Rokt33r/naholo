import { NextRequest, NextResponse } from 'next/server'
import { requireProjectWorker } from '@/server/auth/utils'
import { getProjectWorker } from '@/server/services/project-worker'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; workerId: string }> },
) {
  try {
    const { projectId, workerId } = await params
    await requireProjectWorker(projectId)

    const worker = await getProjectWorker(workerId, projectId)

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
