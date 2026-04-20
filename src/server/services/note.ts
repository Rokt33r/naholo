import 'server-only'
import { db } from '../db'
import { operationNotes, operations } from '../db/schema'
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
 * List notes for an operation (ordered by position)
 */
export async function listNotes(data: {
  operationId: string
}): Promise<Note[]> {
  return db.query.operationNotes.findMany({
    columns: {
      id: true,
      name: true,
      content: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq }) => eq(t.operationId, data.operationId),
    orderBy: (t, { asc }) => asc(t.position),
  })
}

/**
 * Find a note by name within an operation
 */
export async function findNoteByName(data: {
  operationId: string
  name: string
}): Promise<Note | undefined> {
  return db.query.operationNotes.findFirst({
    columns: {
      id: true,
      name: true,
      content: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    where: (t, { eq, and }) =>
      and(eq(t.operationId, data.operationId), eq(t.name, data.name)),
  })
}

/**
 * Create a new note
 */
export async function createNote(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  name: string
  content: string
}): Promise<ReturnResult<Note>> {
  // Get the maximum position for notes in this operation
  const existingNotes = await db.query.operationNotes.findMany({
    columns: { position: true },
    where: (t, { eq }) => eq(t.operationId, data.operationId),
    orderBy: (t, { asc }) => asc(t.position),
  })

  const maxPosition =
    existingNotes.length > 0
      ? Math.max(...existingNotes.map((n) => n.position))
      : -1

  const [note] = await db
    .insert(operationNotes)
    .values({
      projectId: data.projectId,
      operationId: data.operationId,
      projectOperatorId: data.projectOperatorId,
      name: data.name,
      content: data.content,
      position: maxPosition + 1,
    })
    .returning({
      id: operationNotes.id,
      name: operationNotes.name,
      content: operationNotes.content,
      position: operationNotes.position,
      createdAt: operationNotes.createdAt,
      updatedAt: operationNotes.updatedAt,
    })

  // Update operation's updatedAt timestamp
  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok(note)
}

/**
 * Update a note.
 */
export async function updateNote(data: {
  projectOperatorId: string
  noteName: string
  operationId: string
  name?: string
  content?: string
}): Promise<ReturnResult<Note>> {
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (data.name != null && data.name !== data.noteName) {
    // Validate uniqueness of new name within the operation
    const existing = await findNoteByName({
      operationId: data.operationId,
      name: data.name,
    })
    if (existing != null) {
      return err(
        new Error('A note with this name already exists in this operation'),
      )
    }
    updates.name = data.name
  }
  if (data.content != null) {
    updates.content = data.content
  }

  const [note] = await db
    .update(operationNotes)
    .set(updates)
    .where(
      and(
        eq(operationNotes.operationId, data.operationId),
        eq(operationNotes.name, data.noteName),
      ),
    )
    .returning({
      id: operationNotes.id,
      name: operationNotes.name,
      content: operationNotes.content,
      position: operationNotes.position,
      createdAt: operationNotes.createdAt,
      updatedAt: operationNotes.updatedAt,
    })

  if (!note) {
    return err(new NotFoundError('Note'))
  }

  // Update operation's updatedAt timestamp
  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok(note)
}

/**
 * Delete a note.
 */
export async function deleteNote(data: {
  projectOperatorId: string
  noteName: string
  operationId: string
}): Promise<ReturnResult<undefined>> {
  const [note] = await db
    .delete(operationNotes)
    .where(
      and(
        eq(operationNotes.operationId, data.operationId),
        eq(operationNotes.name, data.noteName),
      ),
    )
    .returning({ id: operationNotes.id })

  if (!note) {
    return err(new NotFoundError('Note'))
  }

  // Update operation's updatedAt timestamp
  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, data.operationId))

  return ok()
}
