import { NextRequest, NextResponse } from 'next/server'
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
 * POST /api/projects/[projectId]/issues/[issueId]/close
 * Close an issue
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId } = await context.params

  const [closedIssue] = await db
    .update(issues)
    .set({
      closed: true,
      closedAt: new Date(),
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

  if (!closedIssue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
  }

  return NextResponse.json(closedIssue)
}

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]/close
 * Reopen an issue
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId } = await context.params

  const [reopenedIssue] = await db
    .update(issues)
    .set({
      closed: false,
      closedAt: null,
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

  if (!reopenedIssue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
  }

  return NextResponse.json(reopenedIssue)
}
