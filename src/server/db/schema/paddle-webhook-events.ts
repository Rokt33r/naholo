import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'

export const paddleWebhookEvents = pgTable(
  'paddle_webhook_events',
  {
    id: uuidV7IdColumn(),
    eventId: text('event_id').notNull(),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at').notNull(),
    paddleTransactionId: text('paddle_transaction_id'),
    paddleSubscriptionId: text('paddle_subscription_id'),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('paddle_webhook_events_event_id_idx').on(table.eventId),
    index('paddle_webhook_events_paddle_transaction_id_idx').on(
      table.paddleTransactionId,
    ),
    index('paddle_webhook_events_paddle_subscription_id_idx').on(
      table.paddleSubscriptionId,
    ),
  ],
)
