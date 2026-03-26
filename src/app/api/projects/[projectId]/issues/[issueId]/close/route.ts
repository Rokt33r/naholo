import { NextRequest, NextResponse } from 'next/server'
import { requireIssueAccess } from '@/server/auth/utils'
import { closeIssue, reopenIssue } from '@/server/services/issue'

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
  try {
    const { projectId, issueId } = await context.params
    await requireIssueAccess(projectId, issueId)

    const result = await closeIssue({ projectId, issueId })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]/close
 * Reopen an issue
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueId } = await context.params
    await requireIssueAccess(projectId, issueId)

    const result = await reopenIssue({ projectId, issueId })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
