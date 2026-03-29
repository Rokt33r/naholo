import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { skills } from './skills'

export const skillRevisions = pgTable('skill_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const skillRevisionsRelations = relations(skillRevisions, ({ one }) => ({
  skill: one(skills, {
    fields: [skillRevisions.skillId],
    references: [skills.id],
  }),
}))
