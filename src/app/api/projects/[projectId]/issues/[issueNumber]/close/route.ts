import { NextRequest, NextResponse } from 'next/server'
import { requireIssueAccess } from '@/server/auth/permissions'
import { closeIssue, reopenIssue } from '@/server/services/issue'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueNumber: string
  }>
}

/**
 * POST /api/projects/[projectId]/issues/[issueNumber]/close
 * Close an issue
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params
    const { issue } = await requireIssueAccess(projectId, issueNumber)

    const result = await closeIssue({
      projectId,
      issueNumber: issue.number,
    })

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
 * DELETE /api/projects/[projectId]/issues/[issueNumber]/close
 * Reopen an issue
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params
    const { issue } = await requireIssueAccess(projectId, issueNumber)

    const result = await reopenIssue({
      projectId,
      issueNumber: issue.number,
    })

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
