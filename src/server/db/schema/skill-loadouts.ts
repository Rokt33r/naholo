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

export const skillLoadouts = pgTable(
  'skill_loadouts',
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
    uniqueIndex('skill_loadouts_project_id_slug_unique').on(
      t.projectId,
      t.slug,
    ),
  ],
)

export const skillLoadoutsRelations = relations(
  skillLoadouts,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [skillLoadouts.projectId],
      references: [projects.id],
    }),
    skills: many(skills),
  }),
)
