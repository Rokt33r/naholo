import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  requireProjectWorker,
  requireAdminProjectWorker,
} from '@/server/auth/permissions'
import {
  createProjectWorker,
  listProjectWorkers,
} from '@/server/services/project-worker'

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

const createWorkerSchema = z.object({
  name: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project } = await requireAdminProjectWorker(projectSlug)

    const body = await request.json()
    const parsed = createWorkerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      )
    }

    const result = await createProjectWorker({
      projectId: project.id,
      name: parsed.data.name,
      type: 'bot',
      role: 'member',
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
