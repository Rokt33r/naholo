import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireProjectWorker } from '@/server/auth/utils'
import { getIssue, updateIssue, deleteIssue } from '@/server/services/issue'

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
  try {
    const { projectId, issueId } = await context.params
    const { projectWorker } = await requireProjectWorker(projectId)

    const issue = await getIssue(projectWorker.id, issueId)

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    return NextResponse.json(issue)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const updateIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
})

/**
 * PATCH /api/projects/[projectId]/issues/[issueId]
 * Update issue title
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueId } = await context.params
    const { projectWorker } = await requireProjectWorker(projectId)

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

    const result = await updateIssue(projectWorker.id, issueId, { title })

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
 * DELETE /api/projects/[projectId]/issues/[issueId]
 * Delete an issue
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueId } = await context.params
    const { projectWorker } = await requireProjectWorker(projectId)

    const result = await deleteIssue(projectWorker.id, issueId)

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
