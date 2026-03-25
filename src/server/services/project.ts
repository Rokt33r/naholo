import 'server-only'
import { db } from '../db'
import { projects } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Project = {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

export type ProjectWorkerInfo = {
  id: string
  type: string
  name: string
  role: string
}

export type ProjectWithWorker = Project & {
  projectWorkerOfCurrentUser: ProjectWorkerInfo
}

export type CreateProjectInput = {
  name: string
  description?: string
}

export type UpdateProjectInput = {
  name: string
  description?: string
}

/**
 * Get a single project by ID
 */
export async function getProject(
  userId: string,
  projectId: string,
): Promise<Project | null> {
  const project = await db.query.projects.findFirst({
    columns: { id: true, name: true, description: true, createdAt: true },
    where: (t, { eq, and }) => and(eq(t.id, projectId), eq(t.userId, userId)),
  })

  return project ?? null
}

/**
 * Get a single project by ID (no user filter — caller must verify access)
 */
export async function getProjectById(
  projectId: string,
): Promise<Project | null> {
  const project = await db.query.projects.findFirst({
    columns: { id: true, name: true, description: true, createdAt: true },
    where: (t, { eq }) => eq(t.id, projectId),
  })

  return project ?? null
}

/**
 * List all projects for a user
 */
export async function listProjects(
  userId: string,
  options?: { with?: 'projectWorkerOfCurrentUser' },
): Promise<Project[] | ProjectWithWorker[]> {
  if (options?.with === 'projectWorkerOfCurrentUser') {
    const result = await db.query.projects.findMany({
      columns: { id: true, name: true, description: true, createdAt: true },
      with: {
        projectWorkers: {
          columns: { id: true, type: true, name: true, role: true },
          where: (t, { eq }) => eq(t.userId, userId),
          limit: 1,
        },
      },
      where: (t, { eq }) => eq(t.userId, userId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    })

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      projectWorkerOfCurrentUser: row.projectWorkers[0],
    }))
  }

  return db.query.projects.findMany({
    columns: { id: true, name: true, description: true, createdAt: true },
    where: (t, { eq }) => eq(t.userId, userId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })
}

/**
 * Create a new project
 */
export async function createProject(
  userId: string,
  data: CreateProjectInput,
): Promise<ReturnResult<{ id: string }>> {
  const [project] = await db
    .insert(projects)
    .values({
      userId,
      name: data.name,
      description: data.description,
    })
    .returning({ id: projects.id })

  return ok({ id: project.id })
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  data: UpdateProjectInput,
): Promise<ReturnResult<undefined>> {
  const [project] = await db
    .update(projects)
    .set({
      name: data.name,
      description: data.description,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id })

  if (!project) return err(new NotFoundError('Project'))

  return ok()
}

/**
 * Delete a project
 */
export async function deleteProject(
  projectId: string,
): Promise<ReturnResult<undefined>> {
  const [project] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id })

  if (!project) return err(new NotFoundError('Project'))

  return ok()
}
