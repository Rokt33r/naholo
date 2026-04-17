import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  requireProjectWorker,
  requireAdminProjectWorker,
} from '@/server/auth/permissions'
import {
  getProjectWorker,
  updateProjectWorker,
} from '@/server/services/project-worker'

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

const updateWorkerSchema = z.object({
  soul: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string; workerId: string }> },
) {
  try {
    const { projectSlug, workerId } = await params
    const { project } = await requireAdminProjectWorker(projectSlug)

    const body = await request.json()
    const parsed = updateWorkerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const updated = await updateProjectWorker(workerId, project.id, parsed.data)
    if (updated == null) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
