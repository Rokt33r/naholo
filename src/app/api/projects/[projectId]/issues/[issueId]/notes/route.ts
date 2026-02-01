import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
import { getIssue } from '@/server/services/issue'
import { listNotes, createNote } from '@/server/services/note'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueId: string
  }>
}

/**
 * GET /api/projects/[projectId]/issues/[issueId]/notes
 * List notes for an issue
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId } = await context.params
  const notesData = await listNotes(user.id, issueId)

  return NextResponse.json(notesData)
}

const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  content: z.string().trim(),
})

/**
 * POST /api/projects/[projectId]/issues/[issueId]/notes
 * Create a new note
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, issueId } = await context.params

  // Check if issue exists and belongs to user
  const issue = await getIssue(user.id, issueId)

  if (!issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
  }

  let body
  try {
    body = await request.json()
  } catch {
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

  const note = await createNote(user.id, { projectId, issueId, title, content })

  return NextResponse.json(note, { status: 201 })
}
