import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { issues } from './issues'
import { projects } from './projects'
import { projectWorkers } from './project-workers'

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    projectWorkerId: uuid('project_worker_id').references(
      () => projectWorkers.id,
      { onDelete: 'set null' },
    ),
    name: text('name').notNull(),
    content: text('content').notNull(), // markdown content
    position: integer('position').notNull().default(0), // for tab ordering
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('notes_issue_id_name_idx').on(table.issueId, table.name),
  ],
)
