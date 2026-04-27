import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { projectOperators } from './project-operators'
import { skillLoadouts } from './skill-loadouts'
import { projectSubscriptions } from './project-subscriptions'

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    slug: text('slug').notNull(),
    operationCounter: integer('operation_counter').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('projects_slug_idx').on(table.slug)],
)

export const projectsRelations = relations(projects, ({ one, many }) => ({
  projectOperators: many(projectOperators),
  skillLoadouts: many(skillLoadouts),
  projectSubscription: one(projectSubscriptions),
}))
