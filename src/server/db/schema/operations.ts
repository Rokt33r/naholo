import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { projectOperators } from './project-operators'

export const operations = pgTable(
  'operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    projectOperatorId: uuid('project_operator_id').references(
      () => projectOperators.id,
      { onDelete: 'set null' },
    ),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    lastOperationLogPreview: text('last_operation_log_preview'),
    closed: boolean('closed').notNull().default(false),
    closedAt: timestamp('closed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('operations_project_id_number_idx').on(
      table.projectId,
      table.number,
    ),
  ],
)
