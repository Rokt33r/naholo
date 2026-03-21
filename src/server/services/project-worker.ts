import 'server-only'
import { db } from '../db'
import { projectWorkers } from '../db/schema'

export type ProjectWorker = {
  id: string
  projectId: string
  userId: string | null
  type: string
  name: string
  role: string
  createdAt: Date
}

export type CreateProjectWorkerInput = {
  projectId: string
  userId: string
  name: string
  type?: 'user' | 'bot'
  role?: 'admin' | 'member'
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
    })
    .returning({ id: projectWorkers.id })

  return { id: worker.id }
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
