import 'server-only'
import { db } from '../db'
import { operations, operationObjectives, projects } from '../db/schema'
import { eq, and, desc, count, sum, sql } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'
import { publishOperationEvent } from '../realtime/publish'

export type Operation = {
  id: string
  projectId: string
  number: number
  title: string
  closed: boolean
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type OperationWithStats = {
  id: string
  number: number
  title: string
  lastOperationLogPreview: string | null
  closed: boolean
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
  totalObjectives: number
  completedObjectives: number
}

/**
 * Get a single operation by number, scoped to a project
 */
export async function getOperation(data: {
  projectId: string
  operationNumber: number
}): Promise<Operation | null> {
  const [operation] = await db
    .select({
      id: operations.id,
      projectId: operations.projectId,
      number: operations.number,
      title: operations.title,
      closed: operations.closed,
      closedAt: operations.closedAt,
      createdAt: operations.createdAt,
      updatedAt: operations.updatedAt,
    })
    .from(operations)
    .where(
      and(
        eq(operations.number, data.operationNumber),
        eq(operations.projectId, data.projectId),
      ),
    )
    .limit(1)

  return operation || null
}

/**
 * List operations for a project with objective statistics
 */
export async function listOperations(data: {
  projectId: string
  closed?: boolean
}): Promise<OperationWithStats[]> {
  const closed = data.closed ?? false

  const rows = await db
    .select({
      id: operations.id,
      number: operations.number,
      title: operations.title,
      lastOperationLogPreview: operations.lastOperationLogPreview,
      closed: operations.closed,
      closedAt: operations.closedAt,
      createdAt: operations.createdAt,
      updatedAt: operations.updatedAt,
      totalObjectives: count(operationObjectives.id).as('total_objectives'),
      completedObjectives: sum(
        sql`CASE WHEN ${operationObjectives.done} THEN 1 ELSE 0 END`,
      ).as('completed_objectives'),
    })
    .from(operations)
    .leftJoin(
      operationObjectives,
      eq(operationObjectives.operationId, operations.id),
    )
    .where(
      and(
        eq(operations.projectId, data.projectId),
        eq(operations.closed, closed),
      ),
    )
    .groupBy(operations.id)
    .orderBy(desc(operations.updatedAt))

  // Convert sum result (string | null) to number
  return rows.map((row) => ({
    ...row,
    completedObjectives: Number(row.completedObjectives ?? 0),
  }))
}

/**
 * Create a new operation
 */
export async function createOperation(data: {
  projectOperatorId: string
  projectId: string
  title: string
}): Promise<ReturnResult<{ id: string; number: number }>> {
  return await db.transaction(async (tx) => {
    const [{ operationCounter }] = await tx
      .update(projects)
      .set({
        operationCounter: sql`${projects.operationCounter} + 1`,
      })
      .where(eq(projects.id, data.projectId))
      .returning({ operationCounter: projects.operationCounter })

    const [operation] = await tx
      .insert(operations)
      .values({
        projectId: data.projectId,
        projectOperatorId: data.projectOperatorId,
        title: data.title,
        number: operationCounter,
      })
      .returning({ id: operations.id })

    return ok({ id: operation.id, number: operationCounter })
  })
}

/**
 * Update an operation.
 */
export async function updateOperation(data: {
  projectId: string
  operationNumber: number
  title: string
}): Promise<ReturnResult<undefined>> {
  const [operation] = await db
    .update(operations)
    .set({
      title: data.title,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operations.number, data.operationNumber),
        eq(operations.projectId, data.projectId),
      ),
    )
    .returning({ id: operations.id })

  if (!operation) {
    return err(new NotFoundError('Operation'))
  }

  publishOperationEvent(operation.id, 'operation-updated')

  return ok()
}

/**
 * Close an operation.
 */
export async function closeOperation(data: {
  projectId: string
  operationNumber: number
}): Promise<ReturnResult<undefined>> {
  const [operation] = await db
    .update(operations)
    .set({
      closed: true,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operations.number, data.operationNumber),
        eq(operations.projectId, data.projectId),
      ),
    )
    .returning({ id: operations.id })

  if (!operation) {
    return err(new NotFoundError('Operation'))
  }

  publishOperationEvent(operation.id, 'operation-updated')

  return ok()
}

/**
 * Reopen an operation.
 */
export async function reopenOperation(data: {
  projectId: string
  operationNumber: number
}): Promise<ReturnResult<undefined>> {
  const [operation] = await db
    .update(operations)
    .set({
      closed: false,
      closedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operations.number, data.operationNumber),
        eq(operations.projectId, data.projectId),
      ),
    )
    .returning({ id: operations.id })

  if (!operation) {
    return err(new NotFoundError('Operation'))
  }

  publishOperationEvent(operation.id, 'operation-updated')

  return ok()
}

/**
 * Delete an operation.
 */
export async function deleteOperation(data: {
  projectId: string
  operationNumber: number
}): Promise<ReturnResult<undefined>> {
  const [operation] = await db
    .delete(operations)
    .where(
      and(
        eq(operations.number, data.operationNumber),
        eq(operations.projectId, data.projectId),
      ),
    )
    .returning({ id: operations.id })

  if (!operation) {
    return err(new NotFoundError('Operation'))
  }

  publishOperationEvent(operation.id, 'operation-deleted')

  return ok()
}

/**
 * Update operation's updatedAt timestamp. Used internally by log/objective/note services.
 */
export async function touchOperation(operationId: string): Promise<void> {
  await db
    .update(operations)
    .set({ updatedAt: new Date() })
    .where(eq(operations.id, operationId))
}

/**
 * Update operation's lastOperationLogPreview. Used internally by operation log service.
 */
export async function updateOperationLastOperationLogPreview(
  operationId: string,
  preview: string | null,
): Promise<void> {
  await db
    .update(operations)
    .set({
      updatedAt: new Date(),
      lastOperationLogPreview: preview,
    })
    .where(eq(operations.id, operationId))
}
