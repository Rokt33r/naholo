import 'server-only'
import { db } from '../db'
import { notes, issues } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Note = {
  id: string
  name: string
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
      name: true,
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
 * Find a note by name within an issue
 */
export async function findNoteByName(data: {
  issueId: string
  name: string
}): Promise<Note | undefined> {
  return db.query.notes.findFirst({
    columns: {
      id: true,
      name: true,
      content: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq, and }) =>
      and(eq(t.issueId, data.issueId), eq(t.name, data.name)),
  })
}

/**
 * Create a new note
 */
export async function createNote(data: {
  projectWorkerId: string
  projectId: string
  issueId: string
  name: string
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
      name: data.name,
      content: data.content,
      position: maxPosition + 1,
    })
    .returning({
      id: notes.id,
      name: notes.name,
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
  name?: string
  content?: string
}): Promise<ReturnResult<Note>> {
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (data.name != null) {
    // Validate uniqueness of new name within the issue
    const existing = await findNoteByName({
      issueId: data.issueId,
      name: data.name,
    })
    if (existing != null && existing.id !== data.noteId) {
      return err(
        new Error('A note with this name already exists in this issue'),
      )
    }
    updates.name = data.name
  }
  if (data.content != null) {
    updates.content = data.content
  }

  const [note] = await db
    .update(notes)
    .set(updates)
    .where(
      and(
        eq(notes.id, data.noteId),
        eq(notes.projectWorkerId, data.projectWorkerId),
      ),
    )
    .returning({
      id: notes.id,
      name: notes.name,
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
