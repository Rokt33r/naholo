import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { operations } from './operations'
import { projects } from './projects'
import { projectOperators } from './project-operators'

export const operationObjectives = pgTable('operation_objectives', {
  id: uuid('id').primaryKey().defaultRandom(),
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
  parentObjectiveId: uuid('parent_objective_id').references(
    (): AnyPgColumn => operationObjectives.id,
    {
      onDelete: 'cascade',
    },
  ), // self-referencing for hierarchy
  name: text('name').notNull(), // objective name (single line)
  note: text('note'), // additional notes (markdown)
  done: boolean('done').notNull().default(false),
  position: integer('position').notNull().default(0), // for ordering
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
