import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'

export type PolarSubscriptionStatus =
  | 'incomplete'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'revoked'

export const polarSubscriptions = pgTable(
  'polar_subscriptions',
  {
    id: uuidV7IdColumn(),
    polarSubscriptionId: text('polar_subscription_id').notNull(),
    polarCustomerId: text('polar_customer_id').notNull(),
    billingEmail: text('billing_email').notNull().default(''),
    metadata: jsonb('metadata'),
    status: text('status').$type<PolarSubscriptionStatus>().notNull(),
    seatQuantity: integer('seat_quantity').notNull().default(1),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    trialEndsAt: timestamp('trial_ends_at'),
    cancelAt: timestamp('cancel_at'),
    canceledAt: timestamp('canceled_at'),
    lastEventOccurredAt: timestamp('last_event_occurred_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('polar_subscriptions_polar_subscription_id_idx').on(
      table.polarSubscriptionId,
    ),
  ],
)
