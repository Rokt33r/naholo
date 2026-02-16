import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { issues } from './issues'
import { projects } from './projects'

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentTaskId: uuid('parent_task_id').references((): AnyPgColumn => tasks.id, {
    onDelete: 'cascade',
  }), // self-referencing for hierarchy
  name: text('name').notNull(), // task name (single line)
  note: text('note'), // additional notes (markdown)
  done: boolean('done').notNull().default(false),
  position: integer('position').notNull().default(0), // for ordering
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
