import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueAccess } from '@/server/auth/permissions'
import { getIssue, updateIssue, deleteIssue } from '@/server/services/issue'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueNumber: string
  }>
}

/**
 * GET /api/projects/[projectId]/issues/[issueNumber]
 * Get a single issue
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params
    const { issue } = await requireIssueAccess(projectId, issueNumber)

    const result = await getIssue({ projectId, issueNumber: issue.number })

    if (result == null) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    return NextResponse.json(result)
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
 * PATCH /api/projects/[projectId]/issues/[issueNumber]
 * Update issue title
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params
    const { issue } = await requireIssueAccess(projectId, issueNumber)

    let body
    try {
      body = await request.json()
    } catch (error) {
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

    const result = await updateIssue({
      projectId,
      issueNumber: issue.number,
      title,
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
 * DELETE /api/projects/[projectId]/issues/[issueNumber]
 * Delete an issue
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params
    const { issue } = await requireIssueAccess(projectId, issueNumber)

    const result = await deleteIssue({ projectId, issueNumber: issue.number })

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
