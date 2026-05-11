import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { skillLoadouts } from './skill-loadouts'
import { skillRevisions } from './skill-revisions'

export const skills = pgTable(
  'skills',
  {
    id: uuidV7IdColumn(),
    skillLoadoutId: uuid('skill_loadout_id')
      .notNull()
      .references(() => skillLoadouts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    content: text('content').notNull(),
    currentRevisionId: uuid('current_revision_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('skills_skill_loadout_id_name_unique').on(
      t.skillLoadoutId,
      t.name,
    ),
  ],
)

export const skillsRelations = relations(skills, ({ one, many }) => ({
  skillLoadout: one(skillLoadouts, {
    fields: [skills.skillLoadoutId],
    references: [skillLoadouts.id],
  }),
  currentRevision: one(skillRevisions, {
    fields: [skills.currentRevisionId],
    references: [skillRevisions.id],
  }),
  revisions: many(skillRevisions),
}))
