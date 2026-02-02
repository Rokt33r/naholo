import 'server-only'
import { db } from '../db'
import { projects } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'

export type Project = {
  id: string
  name: string
  description: string | null
  createdAt: Date
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
): Promise<ReturnResult<Project | null>> {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)

  return ok(project || null)
}

/**
 * List all projects for a user
 */
export async function listProjects(
  userId: string,
): Promise<ReturnResult<Project[]>> {
  const result = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt))

  return ok(result)
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
  userId: string,
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
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning({ id: projects.id })

  if (!project) return err(new Error('Project not found'))

  return ok()
}

/**
 * Delete a project
 */
export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<ReturnResult<undefined>> {
  const [project] = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning({ id: projects.id })

  if (!project) return err(new Error('Project not found'))

  return ok()
}
