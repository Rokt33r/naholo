import 'server-only'
import { db } from '../db'
import { projects } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'

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
): Promise<Project | null> {
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

  return project || null
}

/**
 * List all projects for a user
 */
export async function listProjects(userId: string): Promise<Project[]> {
  return await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt))
}

/**
 * Create a new project
 */
export async function createProject(
  userId: string,
  data: CreateProjectInput,
): Promise<{ id: string }> {
  const [project] = await db
    .insert(projects)
    .values({
      userId,
      name: data.name,
      description: data.description,
    })
    .returning({ id: projects.id })

  return { id: project.id }
}

/**
 * Update a project
 */
export async function updateProject(
  userId: string,
  projectId: string,
  data: UpdateProjectInput,
): Promise<void> {
  await db
    .update(projects)
    .set({
      name: data.name,
      description: data.description,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
}

/**
 * Delete a project
 */
export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<void> {
  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
}
