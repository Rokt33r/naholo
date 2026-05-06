import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import {
  paddleSubscriptions,
  paddleWebhookEvents,
  projectSubscriptions,
  type PaddleSubscriptionStatus,
} from '../db/schema'
import type { PaddleWebhookEventListItem } from './paddle-webhook-event'
import { getPaddleServerClient } from '../billing/paddle'
import { upsertPaddleSubscriptionFromEvent } from '../services/paddle-subscription'

export const PADDLE_SUBSCRIPTION_PAGE_SIZE = 50

export type PaddleSubscriptionListItem = {
  id: string
  paddleSubscriptionId: string
  status: PaddleSubscriptionStatus
  billingEmail: string
  seatQuantity: number
  currentPeriodEnd: Date | null
  lastEventOccurredAt: Date | null
  createdAt: Date
}

export type PaddleSubscriptionDetail = {
  id: string
  paddleSubscriptionId: string
  paddleCustomerId: string
  billingEmail: string
  customData: unknown
  status: PaddleSubscriptionStatus
  seatQuantity: number
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  trialEndsAt: Date | null
  cancelAt: Date | null
  canceledAt: Date | null
  lastEventOccurredAt: Date | null
  createdAt: Date
  updatedAt: Date
  linkedProjectSubscription: {
    id: string
    projectId: string
    projectName: string
    projectSlug: string
  } | null
  recentEvents: PaddleWebhookEventListItem[]
}

export async function listPaddleSubscriptions(input: {
  page: number
  status: PaddleSubscriptionStatus | null
}): Promise<{ rows: PaddleSubscriptionListItem[]; total: number }> {
  const { page, status } = input
  const where =
    status != null ? eq(paddleSubscriptions.status, status) : undefined

  const [rows, total] = await Promise.all([
    db.query.paddleSubscriptions.findMany({
      where,
      orderBy: (t, { desc, sql }) => [
        sql`${t.lastEventOccurredAt} desc nulls last`,
        desc(t.createdAt),
      ],
      limit: PADDLE_SUBSCRIPTION_PAGE_SIZE,
      offset: (page - 1) * PADDLE_SUBSCRIPTION_PAGE_SIZE,
    }),
    db.$count(paddleSubscriptions, where),
  ])

  return {
    rows: rows.map((row) => ({
      id: row.id,
      paddleSubscriptionId: row.paddleSubscriptionId,
      status: row.status,
      billingEmail: row.billingEmail,
      seatQuantity: row.seatQuantity,
      currentPeriodEnd: row.currentPeriodEnd,
      lastEventOccurredAt: row.lastEventOccurredAt,
      createdAt: row.createdAt,
    })),
    total,
  }
}

export async function getPaddleSubscription(
  id: string,
): Promise<PaddleSubscriptionDetail | null> {
  const found = await db.query.paddleSubscriptions.findFirst({
    where: eq(paddleSubscriptions.id, id),
  })
  if (found == null) {
    return null
  }

  const [linked, events] = await Promise.all([
    db.query.projectSubscriptions.findFirst({
      where: eq(projectSubscriptions.paddleSubscriptionId, found.id),
      with: {
        project: { columns: { id: true, name: true, slug: true } },
      },
    }),
    db.query.paddleWebhookEvents.findMany({
      where: eq(
        paddleWebhookEvents.paddleSubscriptionId,
        found.paddleSubscriptionId,
      ),
      orderBy: (t, { desc }) => [desc(t.occurredAt)],
      limit: 20,
    }),
  ])

  return {
    id: found.id,
    paddleSubscriptionId: found.paddleSubscriptionId,
    paddleCustomerId: found.paddleCustomerId,
    billingEmail: found.billingEmail,
    customData: found.customData,
    status: found.status,
    seatQuantity: found.seatQuantity,
    currentPeriodStart: found.currentPeriodStart,
    currentPeriodEnd: found.currentPeriodEnd,
    trialEndsAt: found.trialEndsAt,
    cancelAt: found.cancelAt,
    canceledAt: found.canceledAt,
    lastEventOccurredAt: found.lastEventOccurredAt,
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
    recentEvents: events.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      eventType: row.eventType,
      occurredAt: row.occurredAt,
      paddleTransactionId: row.paddleTransactionId,
      paddleSubscriptionId: row.paddleSubscriptionId,
      createdAt: row.createdAt,
    })),
  }
}

export async function refetchPaddleSubscriptionFromPaddle(
  paddleSubscriptionRowId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await db.query.paddleSubscriptions.findFirst({
    where: eq(paddleSubscriptions.id, paddleSubscriptionRowId),
  })
  if (row == null) {
    return { ok: false, error: 'not_found' }
  }

  let data
  try {
    data = await getPaddleServerClient().subscriptions.get(
      row.paddleSubscriptionId,
    )
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown',
    }
  }

  await upsertPaddleSubscriptionFromEvent({ data, occurredAt: new Date() })
  return { ok: true }
}
