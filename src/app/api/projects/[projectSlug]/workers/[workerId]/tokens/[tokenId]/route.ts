import { NextRequest, NextResponse } from 'next/server'
import { requireProjectWorker } from '@/server/auth/permissions'
import { getProjectWorker } from '@/server/services/project-worker'
import { revokeProjectWorkerApiToken } from '@/server/services/project-worker-api-token'

type RouteContext = {
  params: Promise<{ projectSlug: string; workerId: string; tokenId: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { projectSlug, workerId, tokenId } = await params
    const { project } = await requireProjectWorker(projectSlug)

    const worker = await getProjectWorker(workerId, project.id)
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const result = await revokeProjectWorkerApiToken(workerId, tokenId)

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
