import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import { operationAssignees } from '../db/schema'
import type { ReturnResult } from '@/lib/return-result'
import { ok } from '@/lib/return-result'
import { publishOperationEvent, publishProjectEvent } from '../realtime/publish'

/**
 * Assign project operators to an operation in bulk. Idempotent
 * (`onConflictDoNothing`); operator ids not in the project are silently dropped,
 * and it no-ops when none resolve.
 */
export async function createOperationAssignees(data: {
  projectId: string
  operationId: string
  projectOperatorIds: string[]
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  const validIds = await resolveProjectOperatorIds(
    data.projectId,
    data.projectOperatorIds,
  )
  if (validIds.length === 0) {
    return ok()
  }

  await db
    .insert(operationAssignees)
    .values(
      validIds.map((projectOperatorId) => ({
        operationId: data.operationId,
        projectOperatorId,
      })),
    )
    .onConflictDoNothing()

  publishAssigneeChange(data.operationId, data.projectId, data.sourceClientId)

  return ok()
}

/**
 * Unassign project operators from an operation in bulk. Idempotent — ids that
 * are not assigned are simply not matched.
 */
export async function deleteOperationAssignees(data: {
  projectId: string
  operationId: string
  projectOperatorIds: string[]
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  if (data.projectOperatorIds.length === 0) {
    return ok()
  }

  await db
    .delete(operationAssignees)
    .where(
      and(
        eq(operationAssignees.operationId, data.operationId),
        inArray(operationAssignees.projectOperatorId, data.projectOperatorIds),
      ),
    )

  publishAssigneeChange(data.operationId, data.projectId, data.sourceClientId)

  return ok()
}

/**
 * Return the subset of `ids` that belong to the project — invalid ids are
 * silently dropped.
 */
export async function resolveProjectOperatorIds(
  projectId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) {
    return []
  }
  const rows = await db.query.projectOperators.findMany({
    columns: { id: true },
    where: (t, { and, eq, inArray }) =>
      and(eq(t.projectId, projectId), inArray(t.id, ids)),
  })
  return rows.map((row) => row.id)
}

export async function isProjectOperatorId(
  projectId: string,
  projectOperatorId: string,
): Promise<boolean> {
  const operator = await db.query.projectOperators.findFirst({
    columns: { id: true },
    where: (t, { and, eq }) =>
      and(eq(t.id, projectOperatorId), eq(t.projectId, projectId)),
  })
  return operator != null
}

export async function assignOperatorToOperations(data: {
  projectId: string
  projectOperatorId: string
  operationNumbers: number[]
  sourceClientId?: string
}): Promise<{ opNumbers: number[] }> {
  const operations = await filterValidProjectOperations(
    data.projectId,
    data.operationNumbers,
  )
  if (operations.length === 0) {
    return { opNumbers: [] }
  }

  await db
    .insert(operationAssignees)
    .values(
      operations.map((operation) => ({
        operationId: operation.id,
        projectOperatorId: data.projectOperatorId,
      })),
    )
    .onConflictDoNothing()

  publishBulkAssigneeChange(operations, data.projectId, data.sourceClientId)

  return { opNumbers: operations.map((operation) => operation.number) }
}

export async function unassignOperatorFromOperations(data: {
  projectId: string
  projectOperatorId: string
  operationNumbers: number[]
  sourceClientId?: string
}): Promise<{ opNumbers: number[] }> {
  const operations = await filterValidProjectOperations(
    data.projectId,
    data.operationNumbers,
  )
  if (operations.length === 0) {
    return { opNumbers: [] }
  }

  await db.delete(operationAssignees).where(
    and(
      inArray(
        operationAssignees.operationId,
        operations.map((operation) => operation.id),
      ),
      eq(operationAssignees.projectOperatorId, data.projectOperatorId),
    ),
  )

  publishBulkAssigneeChange(operations, data.projectId, data.sourceClientId)

  return { opNumbers: operations.map((operation) => operation.number) }
}

function publishAssigneeChange(
  operationId: string,
  projectId: string,
  sourceClientId?: string,
): void {
  publishOperationEvent(operationId, 'operation-updated', sourceClientId)
  publishProjectEvent(projectId, 'operations-list-changed', sourceClientId)
}

function publishBulkAssigneeChange(
  operations: { id: string }[],
  projectId: string,
  sourceClientId?: string,
): void {
  for (const operation of operations) {
    publishOperationEvent(operation.id, 'operation-updated', sourceClientId)
  }
  publishProjectEvent(projectId, 'operations-list-changed', sourceClientId)
}

async function filterValidProjectOperations(
  projectId: string,
  operationNumbers: number[],
): Promise<{ id: string; number: number }[]> {
  if (operationNumbers.length === 0) {
    return []
  }
  return db.query.operations.findMany({
    columns: { id: true, number: true },
    where: (t, { and, eq, inArray }) =>
      and(eq(t.projectId, projectId), inArray(t.number, operationNumbers)),
  })
}
