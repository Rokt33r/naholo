import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
import { db } from '@/db'
import { logs, issues } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueId: string
    logId: string
  }>
}

const updateLogSchema = z.object({
  content: z.string().min(1, 'Content is required').trim(),
})

/**
 * PATCH /api/projects/[projectId]/issues/[issueId]/logs/[logId]
 * Update a log
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId, logId } = await context.params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = updateLogSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    )
  }

  const { content } = validation.data

  const [log] = await db
    .update(logs)
    .set({
      content,
      updatedAt: new Date(),
    })
    .where(and(eq(logs.id, logId), eq(logs.userId, user.id)))
    .returning({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })

  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  // Get the most recent log for this issue
  const [lastLog] = await db
    .select({ id: logs.id })
    .from(logs)
    .where(eq(logs.issueId, issueId))
    .orderBy(desc(logs.createdAt))
    .limit(1)

  const newValues: { updatedAt: Date; lastLogPreview?: string | null } = {
    updatedAt: new Date(),
  }

  // Only update preview if this is the most recent log
  if (lastLog && lastLog.id === logId) {
    const preview = content.trim().slice(0, 100)
    newValues.lastLogPreview = preview || null
  }

  await db.update(issues).set(newValues).where(eq(issues.id, issueId))

  return NextResponse.json(log)
}

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]/logs/[logId]
 * Delete a log
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId, logId } = await context.params

  const [log] = await db
    .delete(logs)
    .where(and(eq(logs.id, logId), eq(logs.userId, user.id)))
    .returning({ id: logs.id })

  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  // Get the most recent log for this issue after deletion
  const [lastLog] = await db
    .select({ content: logs.content })
    .from(logs)
    .where(eq(logs.issueId, issueId))
    .orderBy(desc(logs.createdAt))
    .limit(1)

  const newValues: { updatedAt: Date; lastLogPreview?: string | null } = {
    updatedAt: new Date(),
  }

  // Update preview with the new most recent log, or null if no logs left
  if (lastLog) {
    const preview = lastLog.content.trim().slice(0, 100)
    newValues.lastLogPreview = preview || null
  } else {
    newValues.lastLogPreview = null
  }

  await db.update(issues).set(newValues).where(eq(issues.id, issueId))

  return NextResponse.json({ success: true })
}
