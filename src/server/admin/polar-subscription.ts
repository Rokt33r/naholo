import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { polarSubscriptions, projectSubscriptions } from '../db/schema'
import { getPolarServerClient } from '../billing/polar'
import { upsertPolarSubscription } from '../services/polar-subscription'

export const POLAR_SUBSCRIPTION_PAGE_SIZE = 50

export type PolarSubscriptionListItem = {
  id: string
  polarSubscriptionId: string
  status: string
  billingEmail: string
  seats: number | null
  currentPeriodEnd: Date | null
  modifiedAt: Date | null
  createdAt: Date
}

export type PolarSubscriptionDetail = {
  id: string
  polarSubscriptionId: string
  polarCustomerId: string
  billingEmail: string
  metadata: unknown
  status: string
  seats: number | null
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  trialStart: Date | null
  trialEnd: Date | null
  cancelAtPeriodEnd: boolean
  canceledAt: Date | null
  startedAt: Date | null
  endsAt: Date | null
  endedAt: Date | null
  modifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
  linkedProjectSubscription: {
    id: string
    projectId: string
    projectName: string
    projectSlug: string
  } | null
}

export async function listPolarSubscriptions(input: {
  page: number
  status: string | null
}): Promise<{ rows: PolarSubscriptionListItem[]; total: number }> {
  const { page, status } = input
  const where =
    status != null ? eq(polarSubscriptions.status, status) : undefined

  const [rows, total] = await Promise.all([
    db.query.polarSubscriptions.findMany({
      where,
      orderBy: (t, { desc, sql }) => [
        sql`${t.modifiedAt} desc nulls last`,
        desc(t.createdAt),
      ],
      limit: POLAR_SUBSCRIPTION_PAGE_SIZE,
      offset: (page - 1) * POLAR_SUBSCRIPTION_PAGE_SIZE,
    }),
    db.$count(polarSubscriptions, where),
  ])

  return {
    rows: rows.map((row) => ({
      id: row.id,
      polarSubscriptionId: row.polarSubscriptionId,
      status: row.status,
      billingEmail: row.billingEmail,
      seats: row.seats,
      currentPeriodEnd: row.currentPeriodEnd,
      modifiedAt: row.modifiedAt,
      createdAt: row.createdAt,
    })),
    total,
  }
}

export async function getPolarSubscription(
  id: string,
): Promise<PolarSubscriptionDetail | null> {
  const found = await db.query.polarSubscriptions.findFirst({
    where: eq(polarSubscriptions.id, id),
  })
  if (found == null) {
    return null
  }

  const linked = await db.query.projectSubscriptions.findFirst({
    where: eq(projectSubscriptions.polarSubscriptionId, found.id),
    with: {
      project: { columns: { id: true, name: true, slug: true } },
    },
  })

  return {
    id: found.id,
    polarSubscriptionId: found.polarSubscriptionId,
    polarCustomerId: found.polarCustomerId,
    billingEmail: found.billingEmail,
    metadata: found.metadata,
    status: found.status,
    seats: found.seats,
    currentPeriodStart: found.currentPeriodStart,
    currentPeriodEnd: found.currentPeriodEnd,
    trialStart: found.trialStart,
    trialEnd: found.trialEnd,
    cancelAtPeriodEnd: found.cancelAtPeriodEnd,
    canceledAt: found.canceledAt,
    startedAt: found.startedAt,
    endsAt: found.endsAt,
    endedAt: found.endedAt,
    modifiedAt: found.modifiedAt,
    createdAt: found.createdAt,
    updatedAt: found.updatedAt,
    linkedProjectSubscription:
      linked != null
        ? {
            id: linked.id,
            projectId: linked.project.id,
            projectName: linked.project.name,
            projectSlug: linked.project.slug,
          }
        : null,
  }
}

export async function refetchPolarSubscriptionFromPolar(
  polarSubscriptionRowId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await db.query.polarSubscriptions.findFirst({
    where: eq(polarSubscriptions.id, polarSubscriptionRowId),
  })
  if (row == null) {
    return { ok: false, error: 'not_found' }
  }

  let data
  try {
    data = await getPolarServerClient().subscriptions.get({
      id: row.polarSubscriptionId,
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown',
    }
  }

  await upsertPolarSubscription(data)
  return { ok: true }
}
