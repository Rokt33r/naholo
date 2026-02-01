import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
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
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId } = await context.params
  const logsData = await listLogs(user.id, issueId)

  return NextResponse.json(logsData)
}

const createLogSchema = z.object({
  content: z.string().min(1, 'Content is required').trim(),
})

/**
 * POST /api/projects/[projectId]/issues/[issueId]/logs
 * Create a new log
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

  const log = await createLog(user.id, { projectId, issueId, content })

  return NextResponse.json(log, { status: 201 })
}
