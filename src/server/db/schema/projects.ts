import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { projectOperators } from './project-operators'
import { projectSubscriptions } from './project-subscriptions'

export const projectStatus = pgEnum('project_status', [
  'active',
  'inactive',
  'seats-exceeded',
])

export const projects = pgTable(
  'projects',
  {
    id: uuidV7IdColumn(),
    name: text('name').notNull(),
    description: text('description'),
    slug: text('slug').notNull(),
    operationCounter: integer('operation_counter').notNull().default(0),
    activeProjectSubscriptionId: uuid(
      'active_project_subscription_id',
    ).references((): AnyPgColumn => projectSubscriptions.id, {
      onDelete: 'set null',
    }),
    status: projectStatus('status').notNull().default('inactive'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('projects_slug_idx').on(table.slug)],
)

export const projectsRelations = relations(projects, ({ one, many }) => ({
  projectOperators: many(projectOperators),
  activeProjectSubscription: one(projectSubscriptions, {
    fields: [projects.activeProjectSubscriptionId],
    references: [projectSubscriptions.id],
  }),
}))
