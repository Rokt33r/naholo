import 'server-only'
import { db } from '../db'
import { projectWorkers } from '../db/schema'
import { eq, and } from 'drizzle-orm'

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
  const [worker] = await db
    .select({ id: projectWorkers.id, role: projectWorkers.role })
    .from(projectWorkers)
    .where(
      and(
        eq(projectWorkers.projectId, projectId),
        eq(projectWorkers.userId, userId),
      ),
    )
    .limit(1)

  return worker ?? null
}
