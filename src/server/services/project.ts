import 'server-only'
import { db } from '../db'
import { projects } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError, ConflictError } from '../errors'

export type Project = {
  id: string
  slug: string
  name: string
  description: string | null
  createdAt: Date
}

export type ProjectOperatorInfo = {
  id: string
  name: string
  role: string
}

export type ProjectWithCurrentOperator = Project & {
  projectOperatorOfCurrentUser: ProjectOperatorInfo
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
  options?: { with?: 'projectOperatorOfCurrentUser' },
): Promise<Project[] | ProjectWithCurrentOperator[]> {
  const workers = await db.query.projectOperators.findMany({
    columns: {
      id: true,
      name: true,
      role: true,
    },
    with: {
      project: {
        columns: {
          id: true,
          slug: true,
          name: true,
          description: true,
          createdAt: true,
        },
      },
    },
    where: (t, { eq }) => eq(t.userId, userId),
    orderBy: (t, { desc }) => desc(t.createdAt),
  })

  if (options?.with === 'projectOperatorOfCurrentUser') {
    return workers.map((worker) => ({
      ...worker.project,
      projectOperatorOfCurrentUser: {
        id: worker.id,
        name: worker.name,
        role: worker.role,
      },
    }))
  }

  return workers.map((worker) => worker.project)
}

/**
 * Create a new project
 */
const SLUG_PATTERN = /^[a-z0-9-]+$/

export async function createProject(data: {
  name: string
  slug: string
  description?: string
}): Promise<ReturnResult<{ id: string; slug: string }>> {
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

  let project: { id: string } | undefined
  try {
    const [row] = await db
      .update(projects)
      .set({
        ...(data.name != null && { name: data.name }),
        ...(data.description != null && { description: data.description }),
        ...(data.slug != null && { slug: data.slug }),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning({ id: projects.id })
    project = row
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    ) {
      return err(
        new ConflictError({
          code: 'project_slug_taken',
          message: 'A project with this slug already exists',
        }),
      )
    }
    throw error
  }

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
