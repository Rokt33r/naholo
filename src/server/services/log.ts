import 'server-only'
import { db } from '../db'
import { logs, issues } from '../db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'

export type Log = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export type CreateLogInput = {
  projectId: string
  issueId: string
  content: string
}

/**
 * List logs for an issue
 */
export async function listLogs(
  userId: string,
  issueId: string,
): Promise<Log[]> {
  return await db
    .select({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })
    .from(logs)
    .where(and(eq(logs.issueId, issueId), eq(logs.userId, userId)))
    .orderBy(asc(logs.createdAt))
}

/**
 * Create a new log
 */
export async function createLog(
  userId: string,
  data: CreateLogInput,
): Promise<Log> {
  const [log] = await db
    .insert(logs)
    .values({
      projectId: data.projectId,
      issueId: data.issueId,
      userId,
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

  return log
}

/**
 * Update a log.
 */
export async function updateLog(
  userId: string,
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
    .where(and(eq(logs.id, logId), eq(logs.userId, userId)))
    .returning({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })

  if (!log) return err(new Error('Log not found'))

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
  userId: string,
  issueId: string,
  logId: string,
): Promise<ReturnResult<undefined>> {
  const [log] = await db
    .delete(logs)
    .where(and(eq(logs.id, logId), eq(logs.userId, userId)))
    .returning({ id: logs.id })

  if (!log) return err(new Error('Log not found'))

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
