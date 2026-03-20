import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser, requireProjectWorker } from '@/server/auth/utils'
import { listLogs, createLog } from '@/server/services/log'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueId: string
  }>
}

/**
 * GET /api/projects/[projectId]/issues/[issueId]/logs
 * List logs for an issue
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { issueId } = await context.params
    const logs = await listLogs(user.id, issueId)

    return NextResponse.json(logs)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createLogSchema = z.object({
  content: z.string().min(1, 'Content is required').trim(),
})

/**
 * POST /api/projects/[projectId]/issues/[issueId]/logs
 * Create a new log
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, issueId } = await context.params

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = createLogSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { content } = validation.data

    const { userId, projectWorkerId } = await requireProjectWorker(projectId)

    const result = await createLog(userId, {
      projectId,
      projectWorkerId,
      issueId,
      content,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
