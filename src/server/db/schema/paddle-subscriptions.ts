import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export type PaddleSubscriptionStatus =
  | 'incomplete'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'canceled'

export const paddleSubscriptions = pgTable(
  'paddle_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paddleSubscriptionId: text('paddle_subscription_id').notNull(),
    paddleCustomerId: text('paddle_customer_id').notNull(),
    billingEmail: text('billing_email').notNull().default(''),
    customData: jsonb('custom_data'),
    status: text('status').$type<PaddleSubscriptionStatus>().notNull(),
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
    uniqueIndex('paddle_subscriptions_paddle_subscription_id_idx').on(
      table.paddleSubscriptionId,
    ),
  ],
)
