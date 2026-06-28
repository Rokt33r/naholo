import 'server-only'
import { db } from '../db'
import { operations, projects } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from '../errors'
import { publishOperationEvent, publishProjectEvent } from '../realtime/publish'

export type OperationLabel = {
  id: string
  name: string
  color: string
}

export type OperationAssignee = {
  id: string
  projectOperatorId: string
  name: string
}

export type Operation = {
  id: string
  projectId: string
  number: number
  title: string
  closed: boolean
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
  labels: OperationLabel[]
  assignees: OperationAssignee[]
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
  totalTasks: number
  completedTasks: number
  labels: OperationLabel[]
  assignees: OperationAssignee[]
}

/**
 * Get a single operation by number, scoped to a project
 */
export async function getOperation(data: {
  projectId: string
  operationNumber: number
}): Promise<Operation | null> {
  const operation = await db.query.operations.findFirst({
    where: (op, { eq, and }) =>
      and(
        eq(op.number, data.operationNumber),
        eq(op.projectId, data.projectId),
      ),
    with: {
      labels: { with: { projectLabel: true } },
      assignees: { with: { projectOperator: true } },
    },
  })

  if (!operation) {
    return null
  }

  return {
    id: operation.id,
    projectId: operation.projectId,
    number: operation.number,
    title: operation.title,
    closed: operation.closed,
    closedAt: operation.closedAt,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
    labels: mapOperationLabels(operation.labels),
    assignees: mapOperationAssignees(operation.assignees),
  }
}

/**
 * List operations for a project with task statistics
 */
export async function listOperations(data: {
  projectId: string
  closed?: boolean
}): Promise<OperationWithStats[]> {
  const closed = data.closed ?? false

  const rows = await db.query.operations.findMany({
    where: (op, { eq, and }) =>
      and(eq(op.projectId, data.projectId), eq(op.closed, closed)),
    orderBy: (op, { desc }) => desc(op.updatedAt),
    with: {
      tasks: { columns: { id: true, done: true } },
      labels: { with: { projectLabel: true } },
      assignees: { with: { projectOperator: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    title: row.title,
    lastOperationLogPreview: row.lastOperationLogPreview,
    closed: row.closed,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    totalTasks: row.tasks.length,
    completedTasks: row.tasks.filter((task) => task.done).length,
    labels: mapOperationLabels(row.labels),
    assignees: mapOperationAssignees(row.assignees),
  }))
}

/**
 * Create a new operation
 */
export async function createOperation(data: {
  projectOperatorId: string
  projectId: string
  title: string
  sourceClientId?: string
}): Promise<ReturnResult<{ id: string; number: number }>> {
  const result = await db.transaction(async (tx) => {
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

  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return result
}

/**
 * Update an operation.
 */
export async function updateOperation(data: {
  projectId: string
  operationNumber: number
  title: string
  sourceClientId?: string
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

  publishOperationEvent(operation.id, 'operation-updated', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

/**
 * Close an operation.
 */
export async function closeOperation(data: {
  projectId: string
  operationNumber: number
  sourceClientId?: string
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

  publishOperationEvent(operation.id, 'operation-updated', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

/**
 * Reopen an operation.
 */
export async function reopenOperation(data: {
  projectId: string
  operationNumber: number
  sourceClientId?: string
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

  publishOperationEvent(operation.id, 'operation-updated', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

/**
 * Delete an operation.
 */
export async function deleteOperation(data: {
  projectId: string
  operationNumber: number
  sourceClientId?: string
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

  publishOperationEvent(operation.id, 'operation-deleted', data.sourceClientId)
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

/**
 * Update operation's updatedAt timestamp. Used internally by log/task/note services.
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

function mapOperationLabels(
  rows: { projectLabel: { id: string; name: string; color: string } }[],
): OperationLabel[] {
  return rows.map((row) => ({
    id: row.projectLabel.id,
    name: row.projectLabel.name,
    color: row.projectLabel.color,
  }))
}

function mapOperationAssignees(
  rows: { id: string; projectOperator: { id: string; name: string } }[],
): OperationAssignee[] {
  return rows.map((row) => ({
    id: row.id,
    projectOperatorId: row.projectOperator.id,
    name: row.projectOperator.name,
  }))
}
