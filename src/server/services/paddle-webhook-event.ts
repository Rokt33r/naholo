import 'server-only'
import { db } from '../db'
import { paddleWebhookEvents } from '../db/schema'

export type PaddleWebhookEventRow = typeof paddleWebhookEvents.$inferSelect

export async function recordPaddleWebhookEvent(input: {
  eventId: string
  eventType: string
  occurredAt: Date
  paddleTransactionId: string | null
  paddleSubscriptionId: string | null
  payload: unknown
}): Promise<{ inserted: boolean; row: PaddleWebhookEventRow }> {
  const [inserted] = await db
    .insert(paddleWebhookEvents)
    .values({
      eventId: input.eventId,
      eventType: input.eventType,
      occurredAt: input.occurredAt,
      paddleTransactionId: input.paddleTransactionId,
      paddleSubscriptionId: input.paddleSubscriptionId,
      payload: input.payload,
    })
    .onConflictDoNothing({ target: paddleWebhookEvents.eventId })
    .returning()

  if (inserted != null) {
    return { inserted: true, row: inserted }
  }

  const existing = await db.query.paddleWebhookEvents.findFirst({
    where: (t, { eq }) => eq(t.eventId, input.eventId),
  })
  if (existing == null) {
    throw new Error(
      'recordPaddleWebhookEvent: row vanished after conflict on eventId',
    )
  }
  return { inserted: false, row: existing }
}
