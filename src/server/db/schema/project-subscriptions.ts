import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { paddleSubscriptions } from './paddle-subscriptions'
import { projectOperators } from './project-operators'

export const projectSubscriptions = pgTable(
  'project_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    paddleSubscriptionId: uuid('paddle_subscription_id')
      .notNull()
      .references(() => paddleSubscriptions.id, { onDelete: 'cascade' }),
    createdByOperatorId: uuid('created_by_operator_id').references(
      () => projectOperators.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_subscriptions_paddle_subscription_id_idx').on(
      table.paddleSubscriptionId,
    ),
  ],
)

export const projectSubscriptionsRelations = relations(
  projectSubscriptions,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectSubscriptions.projectId],
      references: [projects.id],
    }),
    paddleSubscription: one(paddleSubscriptions, {
      fields: [projectSubscriptions.paddleSubscriptionId],
      references: [paddleSubscriptions.id],
    }),
    createdByOperator: one(projectOperators, {
      fields: [projectSubscriptions.createdByOperatorId],
      references: [projectOperators.id],
    }),
  }),
)
