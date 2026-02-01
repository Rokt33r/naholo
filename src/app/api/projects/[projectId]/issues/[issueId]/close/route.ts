import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/server/auth/utils'
import { getIssue, closeIssue, reopenIssue } from '@/server/services/issue'

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

  const result = await closeIssue(user.id, issueId)

  if (!result.success) {
    return NextResponse.json({ error: result.error.message }, { status: 404 })
  }

  // Fetch the updated issue to return
  const closedIssue = await getIssue(user.id, issueId)

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

  const result = await reopenIssue(user.id, issueId)

  if (!result.success) {
    return NextResponse.json({ error: result.error.message }, { status: 404 })
  }

  // Fetch the updated issue to return
  const reopenedIssue = await getIssue(user.id, issueId)

  return NextResponse.json(reopenedIssue)
}
