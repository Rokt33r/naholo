import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
import { db } from '@/db'
import { issues } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueId: string
  }>
}

/**
 * GET /api/projects/[projectId]/issues/[issueId]
 * Get a single issue
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId } = await context.params

  const [issue] = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      title: issues.title,
      closed: issues.closed,
      closedAt: issues.closedAt,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .where(and(eq(issues.id, issueId), eq(issues.userId, user.id)))
    .limit(1)

  if (!issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
  }

  return NextResponse.json(issue)
}

const updateIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
})

/**
 * PATCH /api/projects/[projectId]/issues/[issueId]
 * Update issue title
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId } = await context.params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = updateIssueSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    )
  }

  const { title } = validation.data

  const [updatedIssue] = await db
    .update(issues)
    .set({
      title,
      updatedAt: new Date(),
    })
    .where(and(eq(issues.id, issueId), eq(issues.userId, user.id)))
    .returning({
      id: issues.id,
      projectId: issues.projectId,
      title: issues.title,
      closed: issues.closed,
      closedAt: issues.closedAt,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })

  if (!updatedIssue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
  }

  return NextResponse.json(updatedIssue)
}

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]
 * Delete an issue
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId } = await context.params

  const [deletedIssue] = await db
    .delete(issues)
    .where(and(eq(issues.id, issueId), eq(issues.userId, user.id)))
    .returning({ id: issues.id, projectId: issues.projectId })

  if (!deletedIssue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, projectId: deletedIssue.projectId })
}
