import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { projectWorkers } from '../db/schema'

export type ProjectWorker = {
  id: string
  projectId: string
  userId: string | null
  type: string
  name: string
  role: string
  soul: string | null
  createdAt: Date
}

export type CreateProjectWorkerInput = {
  projectId: string
  userId?: string
  name: string
  type?: 'user' | 'bot'
  role?: 'admin' | 'member'
  soul?: string
}

/**
 * Create a project worker
 */
export async function createProjectWorker(
  data: CreateProjectWorkerInput,
): Promise<{ id: string }> {
  const [worker] = await db
    .insert(projectWorkers)
    .values({
      projectId: data.projectId,
      userId: data.userId,
      name: data.name,
      type: data.type ?? 'user',
      role: data.role ?? 'member',
      soul: data.soul,
    })
    .returning({ id: projectWorkers.id })

  return { id: worker.id }
}

export type UpdateProjectWorkerInput = {
  soul?: string
}

/**
 * Update a project worker
 */
export async function updateProjectWorker(
  workerId: string,
  projectId: string,
  data: UpdateProjectWorkerInput,
): Promise<ProjectWorker | null> {
  const [updated] = await db
    .update(projectWorkers)
    .set(data)
    .where(
      and(
        eq(projectWorkers.id, workerId),
        eq(projectWorkers.projectId, projectId),
      ),
    )
    .returning()

  return updated ?? null
}

/**
 * List all workers in a project
 */
export async function listProjectWorkers(
  projectId: string,
): Promise<ProjectWorker[]> {
  return db.query.projectWorkers.findMany({
    where: (t, { eq }) => eq(t.projectId, projectId),
    orderBy: (t, { asc }) => asc(t.createdAt),
  })
}

/**
 * Get a single project worker by ID
 */
export async function getProjectWorker(
  workerId: string,
  projectId: string,
): Promise<ProjectWorker | null> {
  const worker = await db.query.projectWorkers.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.id, workerId), eq(t.projectId, projectId)),
  })

  return worker ?? null
}

/**
 * Get a project worker by user ID and project ID
 */
export async function getProjectWorkerByUserId(
  userId: string,
  projectId: string,
): Promise<{ id: string; role: string } | null> {
  const worker = await db.query.projectWorkers.findFirst({
    columns: { id: true, role: true },
    where: (t, { eq, and }) =>
      and(eq(t.projectId, projectId), eq(t.userId, userId)),
  })

  return worker ?? null
}

/**
 * Resolve a project worker by user ID and project ID.
 * Returns the full worker or null if not found.
 */
export async function resolveProjectWorkerByUserIdAndProjectId(
  userId: string,
  projectId: string,
): Promise<ProjectWorker | null> {
  const worker = await db.query.projectWorkers.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.projectId, projectId), eq(t.userId, userId)),
  })

  return worker ?? null
}
