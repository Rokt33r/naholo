import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueAccess } from '@/server/auth/permissions'
import { listNotes, createNote } from '@/server/services/note'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueNumber: string
  }>
}

/**
 * GET /api/projects/[projectId]/issues/[issueNumber]/notes
 * List notes for an issue
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueNumber } = await context.params
    const { issue } = await requireIssueAccess(projectId, issueNumber)

    const notes = await listNotes({ issueId: issue.id })

    return NextResponse.json(notes)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  content: z.string().trim(),
})

/**
 * POST /api/projects/[projectId]/issues/[issueNumber]/notes
 * Create a new note
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

    const validation = createNoteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { title, content } = validation.data

    const { projectWorker, issue } = await requireIssueAccess(
      projectId,
      issueNumber,
    )

    const result = await createNote({
      projectWorkerId: projectWorker.id,
      projectId,
      issueId: issue.id,
      title,
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
