import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { projectWorkers } from './project-workers'

export const projectWorkerApiTokens = pgTable('project_worker_api_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectWorkerId: uuid('project_worker_id')
    .notNull()
    .references(() => projectWorkers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull(),
  tokenHint: text('token_hint').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const projectWorkerApiTokensRelations = relations(
  projectWorkerApiTokens,
  ({ one }) => ({
    projectWorker: one(projectWorkers, {
      fields: [projectWorkerApiTokens.projectWorkerId],
      references: [projectWorkers.id],
    }),
  }),
)
