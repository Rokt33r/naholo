import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { skillSets } from './skill-sets'
import { skillRevisions } from './skill-revisions'

export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    skillSetId: uuid('skill_set_id')
      .notNull()
      .references(() => skillSets.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    content: text('content').notNull(),
    currentRevisionId: uuid('current_revision_id'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('skills_skill_set_id_name_unique').on(t.skillSetId, t.name),
  ],
)

export const skillsRelations = relations(skills, ({ one, many }) => ({
  skillSet: one(skillSets, {
    fields: [skills.skillSetId],
    references: [skillSets.id],
  }),
  currentRevision: one(skillRevisions, {
    fields: [skills.currentRevisionId],
    references: [skillRevisions.id],
  }),
  revisions: many(skillRevisions),
}))
