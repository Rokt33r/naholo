import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { projectLabels } from '../db/schema'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { ConflictError, NotFoundError } from '../errors'
import { isUniqueViolationError } from '../db/utils'

export type ProjectLabel = {
  id: string
  projectId: string
  name: string
  color: string
  createdAt: Date
  updatedAt: Date
}

/**
 * List all labels in a project.
 */
export async function listProjectLabels(
  projectId: string,
): Promise<ProjectLabel[]> {
  return db.query.projectLabels.findMany({
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { asc }) => asc(t.createdAt),
  })
}

/**
 * Create a project label. Fails with a conflict when the name is already taken
 * within the project.
 */
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
