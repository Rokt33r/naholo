import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { skillRevisions } from './skill-revisions'

export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    content: text('content').notNull(),
    currentRevisionId: uuid('current_revision_id'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('skills_project_id_name_unique').on(t.projectId, t.name)],
)

export const skillsRelations = relations(skills, ({ one, many }) => ({
  project: one(projects, {
    fields: [skills.projectId],
    references: [projects.id],
  }),
  currentRevision: one(skillRevisions, {
    fields: [skills.currentRevisionId],
    references: [skillRevisions.id],
  }),
  revisions: many(skillRevisions),
}))
