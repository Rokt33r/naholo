import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import {
  projectSubscriptions,
  type PaddleSubscriptionStatus,
} from '../db/schema'

export const PROJECT_SUBSCRIPTION_PAGE_SIZE = 50

export type ProjectSubscriptionListItem = {
  id: string
  createdAt: Date
  projectId: string
  projectName: string
  projectSlug: string
  paddleSubscriptionRowId: string
  paddleSubscriptionId: string
  paddleSubscriptionStatus: PaddleSubscriptionStatus
  createdByOperatorId: string | null
  createdByOperatorName: string | null
}

export type ProjectSubscriptionDetail = {
  id: string
  createdAt: Date
  updatedAt: Date
  project: { id: string; name: string; slug: string }
  paddleSubscription: {
    id: string
    paddleSubscriptionId: string
    status: PaddleSubscriptionStatus
  }
  createdByOperator: {
    id: string
    userName: string | null
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
        paddleSubscription: {
          columns: { id: true, paddleSubscriptionId: true, status: true },
        },
        createdByOperator: {
          columns: { id: true },
          with: { user: { columns: { id: true, name: true } } },
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
      paddleSubscriptionRowId: row.paddleSubscription.id,
      paddleSubscriptionId: row.paddleSubscription.paddleSubscriptionId,
      paddleSubscriptionStatus: row.paddleSubscription.status,
      createdByOperatorId: row.createdByOperator?.id ?? null,
      createdByOperatorName: row.createdByOperator?.user?.name ?? null,
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
      paddleSubscription: true,
      createdByOperator: {
        with: { user: true },
      },
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
    paddleSubscription: {
      id: row.paddleSubscription.id,
      paddleSubscriptionId: row.paddleSubscription.paddleSubscriptionId,
      status: row.paddleSubscription.status,
    },
    createdByOperator:
      row.createdByOperator != null
        ? {
            id: row.createdByOperator.id,
            userName: row.createdByOperator.user?.name ?? null,
          }
        : null,
  }
}
