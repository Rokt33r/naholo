import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { polarWebhookEvents } from '../db/schema'

export const POLAR_WEBHOOK_EVENT_PAGE_SIZE = 50

export type PolarWebhookEventListItem = {
  id: string
  webhookEventId: string | null
  eventType: string
  eventTimestamp: Date
  eventDataId: string | null
  createdAt: Date
}

export type PolarWebhookEventDetail = PolarWebhookEventListItem & {
  payload: unknown
}

export async function listPolarWebhookEvents(input: {
  page: number
  eventType: string | null
}): Promise<{ rows: PolarWebhookEventListItem[]; total: number }> {
  const { page, eventType } = input
  const where =
    eventType != null ? eq(polarWebhookEvents.eventType, eventType) : undefined

  const [rows, total] = await Promise.all([
    db.query.polarWebhookEvents.findMany({
      where,
      orderBy: (t, { desc }) => [desc(t.eventTimestamp)],
      limit: POLAR_WEBHOOK_EVENT_PAGE_SIZE,
      offset: (page - 1) * POLAR_WEBHOOK_EVENT_PAGE_SIZE,
    }),
    db.$count(polarWebhookEvents, where),
  ])

  return {
    rows: rows.map((row) => ({
      id: row.id,
      webhookEventId: row.webhookEventId,
      eventType: row.eventType,
      eventTimestamp: row.eventTimestamp,
      eventDataId: row.eventDataId,
      createdAt: row.createdAt,
    })),
    total,
  }
}

export async function getPolarWebhookEvent(
  id: string,
): Promise<PolarWebhookEventDetail | null> {
  const row = await db.query.polarWebhookEvents.findFirst({
    where: eq(polarWebhookEvents.id, id),
  })
  if (row == null) {
    return null
  }
  return {
    id: row.id,
    webhookEventId: row.webhookEventId,
    eventType: row.eventType,
    eventTimestamp: row.eventTimestamp,
    eventDataId: row.eventDataId,
    createdAt: row.createdAt,
    payload: row.payload,
  }
}
