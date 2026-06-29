import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { operationAssignees } from '../db/schema'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from '../errors'
import { publishOperationEvent, publishProjectEvent } from '../realtime/publish'

/**
 * Assign a project operator to an operation. Idempotent — re-assigning an already
 * assigned operator is a no-op. Fails when the operator does not belong to the project.
 */
export async function attachOperationAssignee(data: {
  projectId: string
  operationId: string
  projectOperatorId: string
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  const operator = await db.query.projectOperators.findFirst({
    columns: { id: true },
    where: (t, { eq, and }) =>
      and(eq(t.id, data.projectOperatorId), eq(t.projectId, data.projectId)),
  })

  if (operator == null) {
    return err(new NotFoundError('Operator'))
  }

  await db
    .insert(operationAssignees)
    .values({
      operationId: data.operationId,
      projectOperatorId: data.projectOperatorId,
    })
    .onConflictDoNothing()

  publishOperationEvent(
    data.operationId,
    'operation-updated',
    data.sourceClientId,
  )
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}

/**
 * Unassign a project operator from an operation. Idempotent — unassigning an
 * operator that is not assigned is a no-op.
 */
export async function detachOperationAssignee(data: {
  projectId: string
  operationId: string
  projectOperatorId: string
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  await db
    .delete(operationAssignees)
    .where(
      and(
        eq(operationAssignees.operationId, data.operationId),
        eq(operationAssignees.projectOperatorId, data.projectOperatorId),
      ),
    )

  publishOperationEvent(
    data.operationId,
    'operation-updated',
    data.sourceClientId,
  )
  publishProjectEvent(
    data.projectId,
    'operations-list-changed',
    data.sourceClientId,
  )

  return ok()
}
