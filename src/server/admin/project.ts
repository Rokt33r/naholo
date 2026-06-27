import 'server-only'
import { db } from '../db'
import type { ProjectStatus } from '../services/project-status'

export type ProjectListItem = {
  id: string
  name: string
  slug: string
  status: ProjectStatus
  operatorCount: number
  createdAt: Date
}

export async function listAllProjects(): Promise<ProjectListItem[]> {
  const rows = await db.query.projects.findMany({
    columns: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
    },
    with: {
      projectOperators: { columns: { id: true } },
    },
    orderBy: (t, { desc }) => desc(t.createdAt),
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    operatorCount: row.projectOperators.length,
    createdAt: row.createdAt,
  }))
}

export type ProjectOperator = {
  id: string
  userId: string
  name: string
  role: string
  createdAt: Date
}

export type ProjectDetail = {
  id: string
  name: string
  slug: string
  status: ProjectStatus
  operators: ProjectOperator[]
}

export async function getProjectDetail(
  projectId: string,
): Promise<ProjectDetail | null> {
  const row = await db.query.projects.findFirst({
    columns: { id: true, name: true, slug: true, status: true },
    with: {
      projectOperators: {
        columns: {
          id: true,
          userId: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: (t, { asc }) => asc(t.createdAt),
      },
    },
    where: (t, { eq }) => eq(t.id, projectId),
  })

  if (row == null) {
    return null
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    operators: row.projectOperators,
  }
}
