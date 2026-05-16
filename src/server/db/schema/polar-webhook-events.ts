import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'

export const polarWebhookEvents = pgTable(
  'polar_webhook_events',
  {
    id: uuidV7IdColumn(),
    polarEventDataId: text('polar_event_data_id'),
    polarWebhookId: text('polar_webhook_id'),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('polar_webhook_events_polar_event_data_id_idx').on(
      table.polarEventDataId,
    ),
    index('polar_webhook_events_polar_webhook_id_idx').on(table.polarWebhookId),
  ],
)
