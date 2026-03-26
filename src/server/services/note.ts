import 'server-only'
import { db } from '../db'
import { notes, issues } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Note = {
  id: string
  title: string
  content: string
  position: number
  createdAt: Date
  updatedAt: Date
}

/**
 * List notes for an issue (ordered by position)
 */
export async function listNotes(data: { issueId: string }): Promise<Note[]> {
  return db.query.notes.findMany({
    columns: {
      id: true,
      title: true,
      content: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq }) => eq(t.issueId, data.issueId),
    orderBy: (t, { asc }) => asc(t.position),
  })
}

/**
 * Create a new note
 */
export async function createNote(data: {
  projectWorkerId: string
  projectId: string
  issueId: string
  title: string
  content: string
}): Promise<ReturnResult<Note>> {
  // Get the maximum position for notes in this issue
  const existingNotes = await db.query.notes.findMany({
    columns: { position: true },
    where: (t, { eq }) => eq(t.issueId, data.issueId),
    orderBy: (t, { asc }) => asc(t.position),
  })

  const maxPosition =
    existingNotes.length > 0
      ? Math.max(...existingNotes.map((n) => n.position))
      : -1

  const [note] = await db
    .insert(notes)
    .values({
      projectId: data.projectId,
      issueId: data.issueId,
      projectWorkerId: data.projectWorkerId,
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
export async function updateNote(data: {
  projectWorkerId: string
  noteId: string
  issueId: string
  title: string
  content: string
}): Promise<ReturnResult<Note>> {
  const [note] = await db
    .update(notes)
    .set({
      title: data.title,
      content: data.content,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notes.id, data.noteId),
        eq(notes.projectWorkerId, data.projectWorkerId),
      ),
    )
    .returning({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      position: notes.position,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })

  if (!note) {
    return err(new NotFoundError('Note'))
  }

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, data.issueId))

  return ok(note)
}

/**
 * Delete a note.
 */
export async function deleteNote(data: {
  projectWorkerId: string
  noteId: string
  issueId: string
}): Promise<ReturnResult<undefined>> {
  const [note] = await db
    .delete(notes)
    .where(
      and(
        eq(notes.id, data.noteId),
        eq(notes.projectWorkerId, data.projectWorkerId),
      ),
    )
    .returning({ id: notes.id })

  if (!note) {
    return err(new NotFoundError('Note'))
  }

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, data.issueId))

  return ok()
}
