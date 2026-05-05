import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { paddleWebhookEvents } from '../db/schema'

export const PADDLE_WEBHOOK_EVENT_PAGE_SIZE = 50

export type PaddleWebhookEventListItem = {
  id: string
  eventId: string
  eventType: string
  occurredAt: Date
  paddleTransactionId: string | null
  paddleSubscriptionId: string | null
  createdAt: Date
}

export type PaddleWebhookEventDetail = PaddleWebhookEventListItem & {
  payload: unknown
}

export async function listPaddleWebhookEvents(input: {
  page: number
  eventType: string | null
}): Promise<{ rows: PaddleWebhookEventListItem[]; total: number }> {
  const { page, eventType } = input
  const where =
    eventType != null ? eq(paddleWebhookEvents.eventType, eventType) : undefined

  const [rows, total] = await Promise.all([
    db.query.paddleWebhookEvents.findMany({
      where,
      orderBy: (t, { desc }) => [desc(t.occurredAt)],
      limit: PADDLE_WEBHOOK_EVENT_PAGE_SIZE,
      offset: (page - 1) * PADDLE_WEBHOOK_EVENT_PAGE_SIZE,
    }),
    db.$count(paddleWebhookEvents, where),
  ])

  return {
    rows: rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      eventType: row.eventType,
      occurredAt: row.occurredAt,
      paddleTransactionId: row.paddleTransactionId,
      paddleSubscriptionId: row.paddleSubscriptionId,
      createdAt: row.createdAt,
    })),
    total,
  }
}

export async function getPaddleWebhookEvent(
  id: string,
): Promise<PaddleWebhookEventDetail | null> {
  const row = await db.query.paddleWebhookEvents.findFirst({
    where: eq(paddleWebhookEvents.id, id),
  })
  if (row == null) {
    return null
  }
  return {
    id: row.id,
    eventId: row.eventId,
    eventType: row.eventType,
    occurredAt: row.occurredAt,
    paddleTransactionId: row.paddleTransactionId,
    paddleSubscriptionId: row.paddleSubscriptionId,
    createdAt: row.createdAt,
    payload: row.payload,
  }
}
