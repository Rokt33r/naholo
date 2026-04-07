import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { skills } from './skills'

export const skillSets = pgTable(
  'skill_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('skill_sets_project_id_slug_unique').on(t.projectId, t.slug),
  ],
)

export const skillSetsRelations = relations(skillSets, ({ one, many }) => ({
  project: one(projects, {
    fields: [skillSets.projectId],
    references: [projects.id],
  }),
  skills: many(skills),
}))
