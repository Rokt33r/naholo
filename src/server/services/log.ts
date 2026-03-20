import 'server-only'
import { db } from '../db'
import { logs, issues } from '../db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Log = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export type CreateLogInput = {
  userId: string
  projectId: string
  issueId: string
  content: string
}

/**
 * List logs for an issue
 */
export async function listLogs(
  projectWorkerId: string,
  issueId: string,
): Promise<Log[]> {
  const result = await db
    .select({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })
    .from(logs)
    .where(
      and(eq(logs.issueId, issueId), eq(logs.projectWorkerId, projectWorkerId)),
    )
    .orderBy(asc(logs.createdAt))

  return result
}

/**
 * Create a new log
 */
export async function createLog(
  projectWorkerId: string,
  data: CreateLogInput,
): Promise<ReturnResult<Log>> {
  // Validate issue exists for worker
  const [issue] = await db
    .select({ id: issues.id })
    .from(issues)
    .where(
      and(
        eq(issues.id, data.issueId),
        eq(issues.projectWorkerId, projectWorkerId),
      ),
    )
    .limit(1)

  if (!issue) return err(new NotFoundError('Issue'))

  const [log] = await db
    .insert(logs)
    .values({
      projectId: data.projectId,
      issueId: data.issueId,
      userId: data.userId,
      projectWorkerId,
      content: data.content,
    })
    .returning({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })

  // Update issue's updatedAt timestamp and lastLogPreview
  const preview = data.content.trim().slice(0, 100)
  await db
    .update(issues)
    .set({
      updatedAt: new Date(),
      lastLogPreview: preview || null,
    })
    .where(eq(issues.id, data.issueId))

  return ok(log)
}

/**
 * Update a log.
 */
export async function updateLog(
  projectWorkerId: string,
  issueId: string,
  logId: string,
  content: string,
): Promise<ReturnResult<Log>> {
  const [log] = await db
    .update(logs)
    .set({
      content,
      updatedAt: new Date(),
    })
    .where(and(eq(logs.id, logId), eq(logs.projectWorkerId, projectWorkerId)))
    .returning({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })

  if (!log) return err(new NotFoundError('Log'))

  // Get the most recent log for this issue
  const [lastLog] = await db
    .select({ id: logs.id })
    .from(logs)
    .where(eq(logs.issueId, issueId))
    .orderBy(desc(logs.createdAt))
    .limit(1)

  const newValues: { updatedAt: Date; lastLogPreview?: string | null } = {
    updatedAt: new Date(),
  }

  // Only update preview if this is the most recent log
  if (lastLog && lastLog.id === logId) {
    const preview = content.trim().slice(0, 100)
    newValues.lastLogPreview = preview || null
  }

  await db.update(issues).set(newValues).where(eq(issues.id, issueId))

  return ok(log)
}

/**
 * Delete a log.
 */
export async function deleteLog(
  projectWorkerId: string,
  issueId: string,
  logId: string,
): Promise<ReturnResult<undefined>> {
  const [log] = await db
    .delete(logs)
    .where(and(eq(logs.id, logId), eq(logs.projectWorkerId, projectWorkerId)))
    .returning({ id: logs.id })

  if (!log) return err(new NotFoundError('Log'))

  // Get the most recent log for this issue after deletion
  const [lastLog] = await db
    .select({ content: logs.content })
    .from(logs)
    .where(eq(logs.issueId, issueId))
    .orderBy(desc(logs.createdAt))
    .limit(1)

  const newValues: { updatedAt: Date; lastLogPreview?: string | null } = {
    updatedAt: new Date(),
  }

  // Update preview with the new most recent log, or null if no logs left
  if (lastLog) {
    const preview = lastLog.content.trim().slice(0, 100)
    newValues.lastLogPreview = preview || null
  } else {
    newValues.lastLogPreview = null
  }

  await db.update(issues).set(newValues).where(eq(issues.id, issueId))

  return ok()
}
