import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { projectSubscriptions } from '../db/schema'

export const PROJECT_SUBSCRIPTION_PAGE_SIZE = 50

export type ProjectSubscriptionListItem = {
  id: string
  createdAt: Date
  projectId: string
  projectName: string
  projectSlug: string
  polarSubscription: {
    rowId: string
    polarSubscriptionId: string
    status: string
  } | null
}

export type ProjectSubscriptionDetail = {
  id: string
  createdAt: Date
  updatedAt: Date
  project: { id: string; name: string; slug: string }
  polarSubscription: {
    id: string
    polarSubscriptionId: string
    status: string
  } | null
}

export async function listProjectSubscriptions(input: {
  page: number
}): Promise<{ rows: ProjectSubscriptionListItem[]; total: number }> {
  const { page } = input

  const [rows, total] = await Promise.all([
    db.query.projectSubscriptions.findMany({
      with: {
        project: { columns: { id: true, name: true, slug: true } },
        polarSubscription: {
          columns: { id: true, polarSubscriptionId: true, status: true },
        },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: PROJECT_SUBSCRIPTION_PAGE_SIZE,
      offset: (page - 1) * PROJECT_SUBSCRIPTION_PAGE_SIZE,
    }),
    db.$count(projectSubscriptions),
  ])

  return {
    rows: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      projectId: row.project.id,
      projectName: row.project.name,
      projectSlug: row.project.slug,
      polarSubscription:
        row.polarSubscription != null
          ? {
              rowId: row.polarSubscription.id,
              polarSubscriptionId: row.polarSubscription.polarSubscriptionId,
              status: row.polarSubscription.status,
            }
          : null,
    })),
    total,
  }
}

export async function getProjectSubscription(
  id: string,
): Promise<ProjectSubscriptionDetail | null> {
  const row = await db.query.projectSubscriptions.findFirst({
    where: eq(projectSubscriptions.id, id),
    with: {
      project: true,
      polarSubscription: true,
    },
  })
  if (row == null) {
    return null
  }
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    project: {
      id: row.project.id,
      name: row.project.name,
      slug: row.project.slug,
    },
    polarSubscription:
      row.polarSubscription != null
        ? {
            id: row.polarSubscription.id,
            polarSubscriptionId: row.polarSubscription.polarSubscriptionId,
            status: row.polarSubscription.status,
          }
        : null,
  }
}
