import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { operations } from './operations'
import { projectLabels } from './project-labels'

export const operationProjectLabels = pgTable(
  'operation_project_labels',
  {
    id: uuidV7IdColumn(),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => operations.id, { onDelete: 'cascade' }),
    projectLabelId: uuid('project_label_id')
      .notNull()
      .references(() => projectLabels.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex(
      'operation_project_labels_operation_id_project_label_id_idx',
    ).on(table.operationId, table.projectLabelId),
  ],
)

export const operationProjectLabelsRelations = relations(
  operationProjectLabels,
  ({ one }) => ({
    operation: one(operations, {
      fields: [operationProjectLabels.operationId],
      references: [operations.id],
    }),
    projectLabel: one(projectLabels, {
      fields: [operationProjectLabels.projectLabelId],
      references: [projectLabels.id],
    }),
  }),
)
