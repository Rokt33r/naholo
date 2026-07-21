import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import { projectLabels, operationProjectLabels } from '../db/schema'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { ConflictError, NotFoundError } from '../errors'
import { isUniqueViolationError } from '../db/utils'
import { publishOperationEvent, publishProjectEvent } from '../realtime/publish'

export type ProjectLabel = {
  id: string
  projectId: string
  name: string
  color: string
  createdAt: Date
  updatedAt: Date
}

export async function listProjectLabels(
  projectId: string,
): Promise<ProjectLabel[]> {
  return db.query.projectLabels.findMany({
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { asc }) => asc(t.createdAt),
  })
}

export async function isProjectLabelId(
  projectId: string,
  labelId: string,
): Promise<boolean> {
  const label = await db.query.projectLabels.findFirst({
    columns: { id: true },
    where: (t, { and, eq }) =>
      and(eq(t.id, labelId), eq(t.projectId, projectId)),
  })
  return label != null
}

export async function filterValidProjectLabelIds(
  projectId: string,
  labelIds: string[],
): Promise<string[]> {
  if (labelIds.length === 0) {
    return []
  }
  const rows = await db.query.projectLabels.findMany({
    columns: { id: true },
    where: (t, { and, eq, inArray }) =>
      and(eq(t.projectId, projectId), inArray(t.id, labelIds)),
  })
  return rows.map((row) => row.id)
}

export async function createProjectLabel(data: {
  projectId: string
  name: string
  color: string
}): Promise<ReturnResult<ProjectLabel>> {
  try {
    const [label] = await db
      .insert(projectLabels)
      .values({
        projectId: data.projectId,
        name: data.name,
        color: data.color,
      })
      .returning()

    return ok(label)
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return err(
        new ConflictError({
          code: 'project_label_name_taken',
          message: 'A label with this name already exists',
        }),
      )
    }
    throw error
  }
}

/**
 * Update a project label's name and/or color, scoped to its project.
 */
export async function updateProjectLabel(data: {
  projectId: string
  labelId: string
  name?: string
  color?: string
}): Promise<ReturnResult<undefined>> {
  let label: { id: string } | undefined
  try {
    const [row] = await db
      .update(projectLabels)
      .set({
        ...(data.name != null && { name: data.name }),
        ...(data.color != null && { color: data.color }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectLabels.id, data.labelId),
          eq(projectLabels.projectId, data.projectId),
        ),
      )
      .returning({ id: projectLabels.id })
    label = row
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return err(
        new ConflictError({
          code: 'project_label_name_taken',
          message: 'A label with this name already exists',
        }),
      )
    }
    throw error
  }

  if (label == null) {
    return err(new NotFoundError('Label'))
  }

  return ok()
}

/**
 * Delete a project label, scoped to its project.
 */
export async function deleteProjectLabel(data: {
  projectId: string
  labelId: string
}): Promise<ReturnResult<undefined>> {
  const [label] = await db
    .delete(projectLabels)
    .where(
      and(
        eq(projectLabels.id, data.labelId),
        eq(projectLabels.projectId, data.projectId),
      ),
    )
    .returning({ id: projectLabels.id })

  if (label == null) {
    return err(new NotFoundError('Label'))
  }

  return ok()
}

export async function createOperationProjectLabels(data: {
  projectId: string
  operationId: string
  projectLabelIds: string[]
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  if (data.projectLabelIds.length === 0) {
    return ok()
  }

  const validLabels = await db.query.projectLabels.findMany({
    columns: { id: true },
    where: (t, { and, eq, inArray }) =>
      and(eq(t.projectId, data.projectId), inArray(t.id, data.projectLabelIds)),
  })
  if (validLabels.length === 0) {
    return ok()
  }

  await db
    .insert(operationProjectLabels)
    .values(
      validLabels.map((label) => ({
        operationId: data.operationId,
        projectLabelId: label.id,
      })),
    )
    .onConflictDoNothing()

  publishLabelChange(data.operationId, data.projectId, data.sourceClientId)

  return ok()
}

export async function deleteOperationProjectLabels(data: {
  projectId: string
  operationId: string
  projectLabelIds: string[]
  sourceClientId?: string
}): Promise<ReturnResult<undefined>> {
  if (data.projectLabelIds.length === 0) {
    return ok()
  }

  await db
    .delete(operationProjectLabels)
    .where(
      and(
        eq(operationProjectLabels.operationId, data.operationId),
        inArray(operationProjectLabels.projectLabelId, data.projectLabelIds),
      ),
    )

  publishLabelChange(data.operationId, data.projectId, data.sourceClientId)

  return ok()
}

export async function attachLabelToOperations(data: {
  projectId: string
  projectLabelId: string
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
    .insert(operationProjectLabels)
    .values(
      operations.map((operation) => ({
        operationId: operation.id,
        projectLabelId: data.projectLabelId,
      })),
    )
    .onConflictDoNothing()

  publishBulkLabelChange(operations, data.projectId, data.sourceClientId)

  return { opNumbers: operations.map((operation) => operation.number) }
}

export async function detachLabelFromOperations(data: {
  projectId: string
  projectLabelId: string
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

  await db.delete(operationProjectLabels).where(
    and(
      inArray(
        operationProjectLabels.operationId,
        operations.map((operation) => operation.id),
      ),
      eq(operationProjectLabels.projectLabelId, data.projectLabelId),
    ),
  )

  publishBulkLabelChange(operations, data.projectId, data.sourceClientId)

  return { opNumbers: operations.map((operation) => operation.number) }
}

function publishLabelChange(
  operationId: string,
  projectId: string,
  sourceClientId?: string,
): void {
  publishOperationEvent(operationId, 'operation-updated', sourceClientId)
  publishProjectEvent(projectId, 'operations-list-changed', sourceClientId)
}

function publishBulkLabelChange(
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
