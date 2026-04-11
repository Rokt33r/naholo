import 'server-only'
import { db } from '../db'
import { logs, issues } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'
import { generateLogPreview } from '@/lib/issue-utils'

export type Log = {
  id: string
  content: string
  projectWorker: { id: string; name: string; type: string } | null
  createdAt: Date
  updatedAt: Date
}

/**
 * List all logs for an issue, including worker info
 */
export async function listLogs(data: { issueId: string }): Promise<Log[]> {
  const result = await db.query.logs.findMany({
    columns: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      projectWorker: {
        columns: { id: true, name: true, type: true },
      },
    },
    where: (t, { eq }) => eq(t.issueId, data.issueId),
    orderBy: (t, { asc }) => asc(t.createdAt),
  })

  return result.map((row) => ({
    id: row.id,
    content: row.content,
    projectWorker: row.projectWorker ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

/**
 * Create a new log
 */
export async function createLog(data: {
  projectWorkerId: string
  projectId: string
  issueId: string
  content: string
}): Promise<
  ReturnResult<{
    id: string
    content: string
    createdAt: Date
    updatedAt: Date
  }>
> {
  const [log] = await db
    .insert(logs)
    .values({
      projectId: data.projectId,
      issueId: data.issueId,
      projectWorkerId: data.projectWorkerId,
      content: data.content,
    })
    .returning({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })

  // Update issue's updatedAt timestamp and lastLogPreview
  const preview = generateLogPreview(data.content)
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
export async function updateLog(data: {
  projectWorkerId: string
  issueId: string
  logId: string
  content: string
}): Promise<
  ReturnResult<{
    id: string
    content: string
    createdAt: Date
    updatedAt: Date
  }>
> {
  const [log] = await db
    .update(logs)
    .set({
      content: data.content,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(logs.id, data.logId),
        eq(logs.projectWorkerId, data.projectWorkerId),
      ),
    )
    .returning({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })

  if (!log) {
    return err(new NotFoundError('Log'))
  }

  // Get the most recent log for this issue
  const lastLog = await db.query.logs.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.issueId, data.issueId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })

  const newValues: { updatedAt: Date; lastLogPreview?: string | null } = {
    updatedAt: new Date(),
  }

  // Only update preview if this is the most recent log
  if (lastLog && lastLog.id === data.logId) {
    const preview = generateLogPreview(data.content)
    newValues.lastLogPreview = preview || null
  }

  await db.update(issues).set(newValues).where(eq(issues.id, data.issueId))

  return ok(log)
}

/**
 * Delete a log.
 */
export async function deleteLog(data: {
  projectWorkerId: string
  issueId: string
  logId: string
}): Promise<ReturnResult<undefined>> {
  const [log] = await db
    .delete(logs)
    .where(
      and(
        eq(logs.id, data.logId),
        eq(logs.projectWorkerId, data.projectWorkerId),
      ),
    )
    .returning({ id: logs.id })

  if (!log) {
    return err(new NotFoundError('Log'))
  }

  // Get the most recent log for this issue after deletion
  const lastLog = await db.query.logs.findFirst({
    columns: { content: true },
    where: (t, { eq }) => eq(t.issueId, data.issueId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })

  const newValues: { updatedAt: Date; lastLogPreview?: string | null } = {
    updatedAt: new Date(),
  }

  // Update preview with the new most recent log, or null if no logs left
  if (lastLog) {
    const preview = generateLogPreview(lastLog.content)
    newValues.lastLogPreview = preview || null
  } else {
    newValues.lastLogPreview = null
  }

  await db.update(issues).set(newValues).where(eq(issues.id, data.issueId))

  return ok()
}
