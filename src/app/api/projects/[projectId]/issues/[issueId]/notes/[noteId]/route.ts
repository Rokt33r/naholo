import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
import { db } from '@/db'
import { notes, issues } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueId: string
    noteId: string
  }>
}

const updateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  content: z.string().trim(),
})

/**
 * PATCH /api/projects/[projectId]/issues/[issueId]/notes/[noteId]
 * Update a note
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId, noteId } = await context.params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = updateNoteSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    )
  }

  const { title, content } = validation.data

  const [note] = await db
    .update(notes)
    .set({
      title,
      content,
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .returning({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      position: notes.position,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })

  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return NextResponse.json(note)
}

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]/notes/[noteId]
 * Delete a note
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId, noteId } = await context.params

  const [note] = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .returning({ id: notes.id })

  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return NextResponse.json({ success: true })
}
