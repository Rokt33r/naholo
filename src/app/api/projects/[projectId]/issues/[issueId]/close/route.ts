import { NextRequest, NextResponse } from 'next/server'
import { requireProjectWorker } from '@/server/auth/utils'
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
    const { projectWorker } = await requireProjectWorker(projectId)

    const result = await closeIssue(projectWorker.id, issueId)

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
    const { projectWorker } = await requireProjectWorker(projectId)

    const result = await reopenIssue(projectWorker.id, issueId)

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
