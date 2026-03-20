import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { projects } from './projects'
import { projectWorkers } from './project-workers'

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectWorkerId: uuid('project_worker_id').references(
    () => projectWorkers.id,
    { onDelete: 'set null' },
  ),
  title: text('title').notNull(),
  lastLogPreview: text('last_log_preview'),
  closed: boolean('closed').notNull().default(false),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
