import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'

export const polarWebhookEvents = pgTable(
  'polar_webhook_events',
  {
    id: uuidV7IdColumn(),
    polarEventId: text('polar_event_id').notNull(),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at').notNull(),
    polarSubscriptionId: text('polar_subscription_id'),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('polar_webhook_events_polar_event_id_idx').on(
      table.polarEventId,
    ),
    index('polar_webhook_events_polar_subscription_id_idx').on(
      table.polarSubscriptionId,
    ),
  ],
)
