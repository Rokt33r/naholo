import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { issues } from './issues'
import { projects } from './projects'
import { projectWorkers } from './project-workers'

export const logs = pgTable('logs', {
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
  content: text('content').notNull(), // markdown content
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
