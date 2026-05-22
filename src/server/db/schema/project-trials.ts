import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { users } from './users'
import { projects } from './projects'

export const projectTrials = pgTable(
  'project_trials',
  {
    id: uuidV7IdColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('project_trials_user_id_idx').on(table.userId)],
)

export const projectTrialsRelations = relations(projectTrials, ({ one }) => ({
  user: one(users, {
    fields: [projectTrials.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [projectTrials.projectId],
    references: [projects.id],
  }),
}))
