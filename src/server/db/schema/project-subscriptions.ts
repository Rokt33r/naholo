import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { projects } from './projects'
import { users } from './users'

export const projectSubscriptions = pgTable(
  'project_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    billingUserId: uuid('billing_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    paddleCustomerId: text('paddle_customer_id'),
    paddleSubscriptionId: text('paddle_subscription_id'),
    status: text('status').notNull().default('incomplete'),
    seatQuantity: integer('seat_quantity').notNull().default(1),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    trialEndsAt: timestamp('trial_ends_at'),
    cancelAt: timestamp('cancel_at'),
    canceledAt: timestamp('canceled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_subscriptions_project_id_idx').on(table.projectId),
    uniqueIndex('project_subscriptions_paddle_subscription_id_idx')
      .on(table.paddleSubscriptionId)
      .where(sql`${table.paddleSubscriptionId} is not null`),
  ],
)

export const projectSubscriptionsRelations = relations(
  projectSubscriptions,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectSubscriptions.projectId],
      references: [projects.id],
    }),
    billingUser: one(users, {
      fields: [projectSubscriptions.billingUserId],
      references: [users.id],
    }),
  }),
)
