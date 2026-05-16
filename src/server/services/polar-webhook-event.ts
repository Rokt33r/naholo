import 'server-only'
import { db } from '../db'
import { polarWebhookEvents } from '../db/schema'

export type PolarWebhookEventRow = typeof polarWebhookEvents.$inferSelect

export async function recordPolarWebhookEvent(input: {
  eventDataId: string | null
  webhookEventId: string | null
  eventType: string
  eventTimestamp: Date
  payload: unknown
}): Promise<PolarWebhookEventRow> {
  const [inserted] = await db
    .insert(polarWebhookEvents)
    .values({
      eventDataId: input.eventDataId,
      webhookEventId: input.webhookEventId,
      eventType: input.eventType,
      eventTimestamp: input.eventTimestamp,
      payload: input.payload,
    })
    .returning()
  if (inserted == null) {
    throw new Error('recordPolarWebhookEvent: insert returned no row')
  }
  return inserted
}
