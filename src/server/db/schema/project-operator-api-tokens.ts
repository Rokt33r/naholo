import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { projectOperators } from './project-operators'

export const projectOperatorApiTokens = pgTable('project_operator_api_tokens', {
  id: uuidV7IdColumn(),
  projectOperatorId: uuid('project_operator_id')
    .notNull()
    .references(() => projectOperators.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull(),
  tokenHint: text('token_hint').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const projectOperatorApiTokensRelations = relations(
  projectOperatorApiTokens,
  ({ one }) => ({
    projectOperator: one(projectOperators, {
      fields: [projectOperatorApiTokens.projectOperatorId],
      references: [projectOperators.id],
    }),
  }),
)
