import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
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
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { logId } = await context.params

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

  const log = await updateLog(user.id, logId, content)

  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: log.id,
    content: log.content,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  })
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

  const { logId } = await context.params

  const log = await deleteLog(user.id, logId)

  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
