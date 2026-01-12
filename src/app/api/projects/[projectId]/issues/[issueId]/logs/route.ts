import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
import { listLogs } from '@/dal/listLogs'
import { db } from '@/db'
import { logs, issues } from '@/db/schema'
import { eq } from 'drizzle-orm'

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
  const logsData = await listLogs(issueId)

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

  const [log] = await db
    .insert(logs)
    .values({
      projectId,
      issueId,
      userId: user.id,
      content,
    })
    .returning({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })

  // Update issue's updatedAt timestamp and lastLogPreview
  const preview = content.trim().slice(0, 100)
  await db
    .update(issues)
    .set({
      updatedAt: new Date(),
      lastLogPreview: preview || null,
    })
    .where(eq(issues.id, issueId))

  return NextResponse.json(log, { status: 201 })
}
