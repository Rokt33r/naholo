import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { projectOperators } from '../db/schema'
import { ConflictError, isUniqueViolationError } from '../errors'

export type ProjectOperator = {
  id: string
  projectId: string
  userId: string
  name: string
  callsign: string
  role: string
  createdAt: Date
}

export type CreateProjectOperatorInput = {
  projectId: string
  userId: string
  name: string
  callsign: string
  role?: 'admin' | 'member'
}

/**
 * Create a project operator
 */
export async function createProjectOperator(
  data: CreateProjectOperatorInput,
): Promise<{ id: string }> {
  const [operator] = await db
    .insert(projectOperators)
    .values({
      projectId: data.projectId,
      userId: data.userId,
      name: data.name,
      callsign: data.callsign,
      role: data.role ?? 'member',
    })
    .returning({ id: projectOperators.id })

  return { id: operator.id }
}

export type UpdateProjectOperatorInput = {
  name?: string
  callsign?: string
}

/**
 * Update a project operator's name and/or callsign, scoped to its project.
 * Throws ConflictError with code 'callsign_taken' when the callsign is
 * already in use within the project.
 */
export async function updateProjectOperator(
  operatorId: string,
  projectId: string,
  data: UpdateProjectOperatorInput,
): Promise<ProjectOperator | null> {
  try {
    const [operator] = await db
      .update(projectOperators)
      .set({
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.callsign != null ? { callsign: data.callsign } : {}),
      })
      .where(
        and(
          eq(projectOperators.id, operatorId),
          eq(projectOperators.projectId, projectId),
        ),
      )
      .returning()

    return operator ?? null
  } catch (error) {
    if (isUniqueViolationError(error)) {
      throw new ConflictError({
        code: 'callsign_taken',
        message: 'Callsign is already in use in this project',
      })
    }
    throw error
  }
}

/**
 * List all operators in a project
 */
export async function listProjectOperators(
  projectId: string,
): Promise<ProjectOperator[]> {
  return db.query.projectOperators.findMany({
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { asc }) => asc(t.createdAt),
  })
}

/**
 * Get a single project operator by ID
 */
export async function getProjectOperator(
  operatorId: string,
  projectId: string,
): Promise<ProjectOperator | null> {
  const operator = await db.query.projectOperators.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.id, operatorId), eq(t.projectId, projectId)),
  })

  return operator ?? null
}

/**
 * Get a project operator by user ID and project ID
 */
export async function getProjectOperatorByUserId(
  userId: string,
  projectId: string,
): Promise<{ id: string; role: string } | null> {
  const operator = await db.query.projectOperators.findFirst({
    columns: { id: true, role: true },
    where: (t, { eq, and }) =>
      and(eq(t.projectId, projectId), eq(t.userId, userId)),
  })

  return operator ?? null
}

/**
 * Delete a project operator by ID, scoped to its project.
 */
export async function deleteProjectOperator(
  operatorId: string,
  projectId: string,
): Promise<{ deleted: boolean }> {
  const rows = await db
    .delete(projectOperators)
    .where(
      and(
        eq(projectOperators.id, operatorId),
        eq(projectOperators.projectId, projectId),
      ),
    )
    .returning({ id: projectOperators.id })

  return { deleted: rows.length > 0 }
}

/**
 * Resolve a project operator by user ID and project ID.
 * Returns the full operator or null if not found.
 */
export async function resolveProjectOperatorByUserIdAndProjectId(
  userId: string,
  projectId: string,
): Promise<ProjectOperator | null> {
  const operator = await db.query.projectOperators.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.projectId, projectId), eq(t.userId, userId)),
  })

  return operator ?? null
}
