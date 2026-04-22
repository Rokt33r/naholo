import 'server-only'
import { db } from '../db'
import {
  operationNotes,
  operationNoteRevisions,
  operations,
} from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'
import { publishOperationEvent } from '../realtime/publish'

export type Note = {
  id: string
  name: string
  content: string
  currentRevisionId: string | null
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
      currentRevisionId: true,
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
      currentRevisionId: true,
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
  sourceClientId?: string
}): Promise<ReturnResult<Note>> {
  const result = await db.transaction(async (tx) => {
    // Get the maximum position for notes in this operation
    const existingNotes = await tx.query.operationNotes.findMany({
      columns: { position: true },
      where: (t, { eq }) => eq(t.operationId, data.operationId),
      orderBy: (t, { asc }) => asc(t.position),
    })

    const maxPosition =
      existingNotes.length > 0
        ? Math.max(...existingNotes.map((n) => n.position))
        : -1

    const [note] = await tx
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

    let currentRevisionId: string | null = null

    // Create initial revision only if content is non-empty
    if (data.content !== '') {
      const [revision] = await tx
        .insert(operationNoteRevisions)
        .values({
          noteId: note.id,
          content: data.content,
        })
        .returning({ id: operationNoteRevisions.id })

      await tx
        .update(operationNotes)
        .set({ currentRevisionId: revision.id })
        .where(eq(operationNotes.id, note.id))

      currentRevisionId = revision.id
    }

    // Update operation's updatedAt timestamp
    await tx
      .update(operations)
      .set({ updatedAt: new Date() })
      .where(eq(operations.id, data.operationId))

    return { ...note, currentRevisionId }
  })

  publishOperationEvent(data.operationId, 'notes-changed', data.sourceClientId)

  return ok(result)
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
  sourceClientId?: string
}): Promise<ReturnResult<Note>> {
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
  }

  const result = await db.transaction(async (tx) => {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name != null && data.name !== data.noteName) {
      updates.name = data.name
    }
    if (data.content != null) {
      updates.content = data.content
    }

    const [note] = await tx
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
        currentRevisionId: operationNotes.currentRevisionId,
        position: operationNotes.position,
        createdAt: operationNotes.createdAt,
        updatedAt: operationNotes.updatedAt,
      })

    if (note == null) {
      return null
    }

    // Create revision only when content changed
    if (data.content != null) {
      const [revision] = await tx
        .insert(operationNoteRevisions)
        .values({
          noteId: note.id,
          content: data.content,
        })
        .returning({ id: operationNoteRevisions.id })

      await tx
        .update(operationNotes)
        .set({ currentRevisionId: revision.id })
        .where(eq(operationNotes.id, note.id))

      note.currentRevisionId = revision.id
    }

    // Update operation's updatedAt timestamp
    await tx
      .update(operations)
      .set({ updatedAt: new Date() })
      .where(eq(operations.id, data.operationId))

    return note
  })

  if (result == null) {
    return err(new NotFoundError('Note'))
  }

  publishOperationEvent(data.operationId, 'notes-changed', data.sourceClientId)

  return ok(result)
}

/**
 * Delete a note.
 */
export async function deleteNote(data: {
  projectOperatorId: string
  noteName: string
  operationId: string
  sourceClientId?: string
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

  publishOperationEvent(data.operationId, 'notes-changed', data.sourceClientId)

  return ok()
}
