import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireProjectWorker } from '@/server/auth/permissions'
import { getProjectWorker } from '@/server/services/project-worker'
import {
  listProjectWorkerApiTokens,
  createProjectWorkerApiToken,
} from '@/server/services/project-worker-api-token'

type RouteContext = {
  params: Promise<{ projectId: string; workerId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId, workerId } = await params
    await requireProjectWorker(projectId)

    const worker = await getProjectWorker(workerId, projectId)
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const tokens = await listProjectWorkerApiTokens(workerId)

    return NextResponse.json(tokens)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createTokenSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
})

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { projectId, workerId } = await params
    await requireProjectWorker(projectId)

    const worker = await getProjectWorker(workerId, projectId)
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = createTokenSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const result = await createProjectWorkerApiToken(workerId, {
      name: validation.data.name,
    })

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
