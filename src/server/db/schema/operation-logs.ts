import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { operations } from './operations'
import { projects } from './projects'
import { projectOperators } from './project-operators'

export const operationLogs = pgTable('operation_logs', {
  id: uuidV7IdColumn(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  operationId: uuid('operation_id')
    .notNull()
    .references(() => operations.id, { onDelete: 'cascade' }),
  projectOperatorId: uuid('project_operator_id').references(
    () => projectOperators.id,
    { onDelete: 'set null' },
  ),
  content: text('content').notNull(), // markdown content
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const operationLogsRelations = relations(operationLogs, ({ one }) => ({
  operation: one(operations, {
    fields: [operationLogs.operationId],
    references: [operations.id],
  }),
  projectOperator: one(projectOperators, {
    fields: [operationLogs.projectOperatorId],
    references: [projectOperators.id],
  }),
}))
