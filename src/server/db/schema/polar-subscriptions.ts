import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'

export const polarSubscriptions = pgTable(
  'polar_subscriptions',
  {
    id: uuidV7IdColumn(),
    polarSubscriptionId: text('polar_subscription_id').notNull(),
    polarCustomerId: text('polar_customer_id').notNull(),
    billingEmail: text('billing_email').notNull().default(''),
    metadata: jsonb('metadata'),
    status: text('status').notNull(),
    seats: integer('seats'),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    trialStart: timestamp('trial_start'),
    trialEnd: timestamp('trial_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at'),
    startedAt: timestamp('started_at'),
    endsAt: timestamp('ends_at'),
    endedAt: timestamp('ended_at'),
    modifiedAt: timestamp('modified_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('polar_subscriptions_polar_subscription_id_idx').on(
      table.polarSubscriptionId,
    ),
  ],
)
