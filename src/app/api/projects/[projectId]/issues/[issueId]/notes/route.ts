import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
import { listNotes } from '@/dal/listNotes'
import { db } from '@/db'
import { notes, issues } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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
  const notesData = await listNotes(issueId)

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
  const [issue] = await db
    .select({ id: issues.id })
    .from(issues)
    .where(and(eq(issues.id, issueId), eq(issues.userId, user.id)))
    .limit(1)

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

  // Get the maximum position for notes in this issue
  const existingNotes = await db
    .select({ position: notes.position })
    .from(notes)
    .where(and(eq(notes.issueId, issueId), eq(notes.userId, user.id)))
    .orderBy(notes.position)

  const maxPosition =
    existingNotes.length > 0
      ? Math.max(...existingNotes.map((n) => n.position))
      : -1

  const [note] = await db
    .insert(notes)
    .values({
      projectId,
      issueId,
      userId: user.id,
      title,
      content,
      position: maxPosition + 1,
    })
    .returning({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      position: notes.position,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return NextResponse.json(note, { status: 201 })
}
