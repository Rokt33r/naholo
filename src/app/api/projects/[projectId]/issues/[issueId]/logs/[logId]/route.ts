import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueLogAccess } from '@/server/auth/utils'
import { updateLog, deleteLog } from '@/server/services/log'

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
  try {
    const { projectId, issueId, logId } = await context.params
    const { projectWorker } = await requireIssueLogAccess(
      projectId,
      issueId,
      logId,
    )

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

    const result = await updateLog({
      projectWorkerId: projectWorker.id,
      issueId,
      logId,
      content,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    const log = result.data
    return NextResponse.json({
      id: log.id,
      content: log.content,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]/logs/[logId]
 * Delete a log
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueId, logId } = await context.params
    const { projectWorker } = await requireIssueLogAccess(
      projectId,
      issueId,
      logId,
    )

    const result = await deleteLog({
      projectWorkerId: projectWorker.id,
      issueId,
      logId,
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
