import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'

export const polarWebhookEvents = pgTable(
  'polar_webhook_events',
  {
    id: uuidV7IdColumn(),
    eventDataId: text('event_data_id'),
    webhookEventId: text('webhook_event_id'),
    eventType: text('event_type').notNull(),
    eventTimestamp: timestamp('event_timestamp').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('polar_webhook_events_event_data_id_idx').on(table.eventDataId),
    index('polar_webhook_events_webhook_event_id_idx').on(table.webhookEventId),
  ],
)
