import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { operations } from './operations'
import { projectOperators } from './project-operators'

export const operationAssignees = pgTable(
  'operation_assignees',
  {
    id: uuidV7IdColumn(),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => operations.id, { onDelete: 'cascade' }),
    projectOperatorId: uuid('project_operator_id')
      .notNull()
      .references(() => projectOperators.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('operation_assignees_operation_id_project_operator_id_idx').on(
      table.operationId,
      table.projectOperatorId,
    ),
  ],
)

export const operationAssigneesRelations = relations(
  operationAssignees,
  ({ one }) => ({
    operation: one(operations, {
      fields: [operationAssignees.operationId],
      references: [operations.id],
    }),
    projectOperator: one(projectOperators, {
      fields: [operationAssignees.projectOperatorId],
      references: [projectOperators.id],
    }),
  }),
)
