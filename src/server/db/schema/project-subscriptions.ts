import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { polarSubscriptions } from './polar-subscriptions'
import { projectOperators } from './project-operators'

export const projectSubscriptions = pgTable(
  'project_subscriptions',
  {
    id: uuidV7IdColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    polarSubscriptionId: uuid('polar_subscription_id')
      .notNull()
      .references(() => polarSubscriptions.id, { onDelete: 'set null' }),
    createdByOperatorId: uuid('created_by_operator_id').references(
      () => projectOperators.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_subscriptions_polar_subscription_id_idx').on(
      table.polarSubscriptionId,
    ),
    uniqueIndex('project_subscriptions_project_id_idx').on(table.projectId),
  ],
)

export const projectSubscriptionsRelations = relations(
  projectSubscriptions,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectSubscriptions.projectId],
      references: [projects.id],
    }),
    polarSubscription: one(polarSubscriptions, {
      fields: [projectSubscriptions.polarSubscriptionId],
      references: [polarSubscriptions.id],
    }),
    createdByOperator: one(projectOperators, {
      fields: [projectSubscriptions.createdByOperatorId],
      references: [projectOperators.id],
    }),
  }),
)
