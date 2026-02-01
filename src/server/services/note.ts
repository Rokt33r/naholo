import 'server-only'
import { db } from '../db'
import { notes, issues } from '../db/schema'
import { eq, and, asc } from 'drizzle-orm'

export type Note = {
  id: string
  title: string
  content: string
  position: number
  createdAt: Date
  updatedAt: Date
}

export type CreateNoteInput = {
  projectId: string
  issueId: string
  title: string
  content: string
}

export type UpdateNoteInput = {
  title: string
  content: string
}

/**
 * List notes for an issue (ordered by position)
 */
export async function listNotes(
  userId: string,
  issueId: string,
): Promise<Note[]> {
  return await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      position: notes.position,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.issueId, issueId), eq(notes.userId, userId)))
    .orderBy(asc(notes.position))
}

/**
 * Create a new note
 */
export async function createNote(
  userId: string,
  data: CreateNoteInput,
): Promise<Note> {
  // Get the maximum position for notes in this issue
  const existingNotes = await db
    .select({ position: notes.position })
    .from(notes)
    .where(and(eq(notes.issueId, data.issueId), eq(notes.userId, userId)))
    .orderBy(notes.position)

  const maxPosition =
    existingNotes.length > 0
      ? Math.max(...existingNotes.map((n) => n.position))
      : -1

  const [note] = await db
    .insert(notes)
    .values({
      projectId: data.projectId,
      issueId: data.issueId,
      userId,
      title: data.title,
      content: data.content,
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
    .where(eq(issues.id, data.issueId))

  return note
}

/**
 * Update a note. Returns the updated note or null if not found.
 */
export async function updateNote(
  userId: string,
  noteId: string,
  issueId: string,
  data: UpdateNoteInput,
): Promise<Note | null> {
  const [note] = await db
    .update(notes)
    .set({
      title: data.title,
      content: data.content,
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      position: notes.position,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })

  if (!note) return null

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return note
}

/**
 * Delete a note. Returns issueId for revalidation.
 */
export async function deleteNote(
  userId: string,
  noteId: string,
  issueId: string,
): Promise<{ issueId: string } | null> {
  const [note] = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning({ id: notes.id })

  if (!note) return null

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return { issueId }
}
