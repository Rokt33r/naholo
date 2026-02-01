import 'server-only'
import { db } from '../db'
import { logs, issues } from '../db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'

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

export type LogContext = {
  projectId: string
  issueId: string
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
 * Update a log. Returns the updated log or null if not found.
 */
export async function updateLog(
  userId: string,
  logId: string,
  content: string,
): Promise<(Log & LogContext) | null> {
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
      projectId: logs.projectId,
      issueId: logs.issueId,
    })

  if (!log) return null

  // Get the most recent log for this issue
  const [lastLog] = await db
    .select({ id: logs.id })
    .from(logs)
    .where(eq(logs.issueId, log.issueId))
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

  await db.update(issues).set(newValues).where(eq(issues.id, log.issueId))

  return log
}

/**
 * Delete a log. Returns context for revalidation.
 */
export async function deleteLog(
  userId: string,
  logId: string,
): Promise<LogContext | null> {
  const [log] = await db
    .delete(logs)
    .where(and(eq(logs.id, logId), eq(logs.userId, userId)))
    .returning({ projectId: logs.projectId, issueId: logs.issueId })

  if (!log) return null

  // Get the most recent log for this issue after deletion
  const [lastLog] = await db
    .select({ content: logs.content })
    .from(logs)
    .where(eq(logs.issueId, log.issueId))
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

  await db.update(issues).set(newValues).where(eq(issues.id, log.issueId))

  return { projectId: log.projectId, issueId: log.issueId }
}
