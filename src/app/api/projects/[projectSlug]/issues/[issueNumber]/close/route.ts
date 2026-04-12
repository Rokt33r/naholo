import { NextRequest, NextResponse } from 'next/server'
import { requireIssueAccess } from '@/server/auth/permissions'
import { closeIssue, reopenIssue } from '@/server/services/issue'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    issueNumber: string
  }>
}

/**
 * POST /api/projects/[projectSlug]/issues/[issueNumber]/close
 * Close an issue
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber } = await context.params
    const { project, issue } = await requireIssueAccess(
      projectSlug,
      issueNumber,
    )

    const result = await closeIssue({
      projectId: project.id,
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
 * DELETE /api/projects/[projectSlug]/issues/[issueNumber]/close
 * Reopen an issue
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber } = await context.params
    const { project, issue } = await requireIssueAccess(
      projectSlug,
      issueNumber,
    )

    const result = await reopenIssue({
      projectId: project.id,
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
