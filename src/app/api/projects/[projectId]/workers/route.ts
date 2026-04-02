import { NextRequest, NextResponse } from 'next/server'
import { requireProjectWorker } from '@/server/auth/permissions'
import { listProjectWorkers } from '@/server/services/project-worker'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    await requireProjectWorker(projectId)

    const workers = await listProjectWorkers(projectId)

    return NextResponse.json(workers)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
