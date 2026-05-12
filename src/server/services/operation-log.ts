import 'server-only'
import { db } from '../db'
import { operationLogs, operations } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from '../errors'
import { generateOperationLogPreview } from '@/lib/operation-utils'
import { publishOperationEvent, publishProjectEvent } from '../realtime/publish'

export type OperationLog = {
  id: string
  content: string
  projectOperator: { id: string; name: string; type: string } | null
  createdAt: Date
  updatedAt: Date
}

/**
 * List all operation logs for an operation, including operator info
 */
export async function listOperationLogs(data: {
  operationId: string
}): Promise<OperationLog[]> {
  const result = await db.query.operationLogs.findMany({
    columns: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      projectOperator: {
        columns: { id: true, name: true, type: true },
      },
    },
    where: (t, { eq }) => eq(t.operationId, data.operationId),
    orderBy: (t, { asc }) => asc(t.createdAt),
  })

  return result.map((row) => ({
    id: row.id,
    content: row.content,
    projectOperator: row.projectOperator ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

/**
 * Create a new operation log
 */
export async function createOperationLog(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  content: string
  sourceClientId?: string
}): Promise<
  ReturnResult<{
    id: string
    content: string
    createdAt: Date
    updatedAt: Date
  }>
> {
  const [log] = await db
    .insert(operationLogs)
    .values({
      projectId: data.projectId,
      operationId: data.operationId,
      projectOperatorId: data.projectOperatorId,
      content: data.content,
    })
    .returning({
      id: operationLogs.id,
      content: operationLogs.content,
      createdAt: operationLogs.createdAt,
      updatedAt: operationLogs.updatedAt,
    })

  // Update operation's updatedAt timestamp and lastOperationLogPreview
  const preview = generateOperationLogPreview(data.content)
  await db
    .update(operations)
    .set({
      updatedAt: new Date(),
      lastOperationLogPreview: preview || null,
    })
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'logs-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok(log)
}

/**
 * Update an operation log.
 */
export async function updateOperationLog(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  logId: string
  content: string
  sourceClientId?: string
}): Promise<
  ReturnResult<{
    id: string
    content: string
    createdAt: Date
    updatedAt: Date
  }>
> {
  const [log] = await db
    .update(operationLogs)
    .set({
      content: data.content,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationLogs.id, data.logId),
        eq(operationLogs.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({
      id: operationLogs.id,
      content: operationLogs.content,
      createdAt: operationLogs.createdAt,
      updatedAt: operationLogs.updatedAt,
    })

  if (!log) {
    return err(new NotFoundError('OperationLog'))
  }

  // Get the most recent log for this operation
  const lastLog = await db.query.operationLogs.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.operationId, data.operationId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })

  const newValues: {
    updatedAt: Date
    lastOperationLogPreview?: string | null
  } = {
    updatedAt: new Date(),
  }

  // Only update preview if this is the most recent log
  if (lastLog && lastLog.id === data.logId) {
    const preview = generateOperationLogPreview(data.content)
    newValues.lastOperationLogPreview = preview || null
  }

  await db
    .update(operations)
    .set(newValues)
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'logs-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok(log)
}

/**
 * Delete an operation log.
 */
export async function deleteOperationLog(data: {
  projectOperatorId: string
  projectId: string
  operationId: string
  logId: string
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  const [log] = await db
    .delete(operationLogs)
    .where(
      and(
        eq(operationLogs.id, data.logId),
        eq(operationLogs.projectOperatorId, data.projectOperatorId),
      ),
    )
    .returning({ id: operationLogs.id })

  if (!log) {
    return err(new NotFoundError('OperationLog'))
  }

  // Get the most recent log for this operation after deletion
  const lastLog = await db.query.operationLogs.findFirst({
    columns: { content: true },
    where: (t, { eq }) => eq(t.operationId, data.operationId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })

  const newValues: {
    updatedAt: Date
    lastOperationLogPreview?: string | null
  } = {
    updatedAt: new Date(),
  }

  // Update preview with the new most recent log, or null if no logs left
  if (lastLog) {
    const preview = generateOperationLogPreview(lastLog.content)
    newValues.lastOperationLogPreview = preview || null
  } else {
    newValues.lastOperationLogPreview = null
  }

  await db
    .update(operations)
    .set(newValues)
    .where(eq(operations.id, data.operationId))

  publishOperationEvent(data.operationId, 'logs-changed', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}
