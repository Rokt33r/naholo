import 'server-only'
import { db } from '../db'
import { projects } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Project = {
  id: string
  slug: string
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

/**
 * Get a single project by ID
 */
export async function getProjectById(
  projectId: string,
): Promise<Project | null> {
  const project = await db.query.projects.findFirst({
    columns: {
      id: true,
      slug: true,
      name: true,
      description: true,
      createdAt: true,
    },
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
      columns: {
        id: true,
        slug: true,
        name: true,
        description: true,
        createdAt: true,
      },
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
      slug: row.slug,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      projectWorkerOfCurrentUser: row.projectWorkers[0],
    }))
  }

  return db.query.projects.findMany({
    columns: {
      id: true,
      slug: true,
      name: true,
      description: true,
      createdAt: true,
    },
    where: (t, { eq }) => eq(t.userId, userId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })
}

/**
 * Create a new project
 */
const SLUG_PATTERN = /^[a-z0-9-]+$/

export async function createProject(
  userId: string,
  data: {
    name: string
    slug: string
    description?: string
  },
): Promise<ReturnResult<{ id: string; slug: string }>> {
  if (!SLUG_PATTERN.test(data.slug)) {
    return err(
      new Error(
        'Invalid slug format. Use lowercase alphanumeric characters and hyphens only.',
      ),
    )
  }

  const existing = await db.query.projects.findFirst({
    columns: { id: true },
    where: (t, { eq }) => eq(t.slug, data.slug),
  })
  if (existing != null) {
    return err(new Error('Slug is already taken.'))
  }

  const [project] = await db
    .insert(projects)
    .values({
      userId,
      name: data.name,
      slug: data.slug,
      description: data.description,
    })
    .returning({ id: projects.id, slug: projects.slug })

  return ok({ id: project.id, slug: project.slug })
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  data: {
    name?: string
    description?: string
    slug?: string
  },
): Promise<ReturnResult<undefined>> {
  // TODO: Validate where this method is used, not in this method
  if (data.slug != null) {
    if (!SLUG_PATTERN.test(data.slug)) {
      return err(
        new Error(
          'Invalid slug format. Use lowercase alphanumeric characters and hyphens only.',
        ),
      )
    }
  }

  const [project] = await db
    .update(projects)
    .set({
      ...(data.name != null && { name: data.name }),
      ...(data.description != null && { description: data.description }),
      ...(data.slug != null && { slug: data.slug }),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id })

  // TODO: requireProjectAccess should confirm this already so we don't need to check this.
  if (project == null) return err(new NotFoundError('Project'))

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
