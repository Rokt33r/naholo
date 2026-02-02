import 'server-only'
import { db } from '../db'
import { notes, issues } from '../db/schema'
import { eq, and, asc } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'

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
): Promise<ReturnResult<Note[]>> {
  const result = await db
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

  return ok(result)
}

/**
 * Create a new note
 */
export async function createNote(
  userId: string,
  data: CreateNoteInput,
): Promise<ReturnResult<Note>> {
  // Validate issue exists for user
  const [issue] = await db
    .select({ id: issues.id })
    .from(issues)
    .where(and(eq(issues.id, data.issueId), eq(issues.userId, userId)))
    .limit(1)

  if (!issue) return err(new Error('Issue not found'))

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

  return ok(note)
}

/**
 * Update a note.
 */
export async function updateNote(
  userId: string,
  noteId: string,
  issueId: string,
  data: UpdateNoteInput,
): Promise<ReturnResult<Note>> {
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

  if (!note) return err(new Error('Note not found'))

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return ok(note)
}

/**
 * Delete a note.
 */
export async function deleteNote(
  userId: string,
  noteId: string,
  issueId: string,
): Promise<ReturnResult<undefined>> {
  const [note] = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning({ id: notes.id })

  if (!note) return err(new Error('Note not found'))

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  return ok()
}
