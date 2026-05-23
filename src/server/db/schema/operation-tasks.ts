import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { operations } from './operations'
import { projects } from './projects'
import { projectOperators } from './project-operators'

export const operationTasks = pgTable('operation_tasks', {
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
  parentTaskId: uuid('parent_task_id').references(
    (): AnyPgColumn => operationTasks.id,
    {
      onDelete: 'cascade',
    },
  ),
  name: text('name').notNull(),
  note: text('note'),
  done: boolean('done').notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const operationTasksRelations = relations(operationTasks, ({ one }) => ({
  operation: one(operations, {
    fields: [operationTasks.operationId],
    references: [operations.id],
  }),
}))
