import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueAccess } from '@/server/auth/permissions'
import { listLogs, createLog } from '@/server/services/log'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueNumber: string
  }>
}

/**
 * GET /api/projects/[projectId]/issues/[issueNumber]/logs
 * List logs for an issue
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params
    const { issue } = await requireIssueAccess(projectId, issueNumber)

    const logs = await listLogs({ issueId: issue.id })

    return NextResponse.json(logs)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createLogSchema = z.object({
  content: z.string().min(1, 'Content is required').trim(),
})

/**
 * POST /api/projects/[projectId]/issues/[issueNumber]/logs
 * Create a new log
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
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

    const { projectWorker, issue } = await requireIssueAccess(
      projectId,
      issueNumber,
    )

    const result = await createLog({
      projectWorkerId: projectWorker.id,
      projectId,
      issueId: issue.id,
      content,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
