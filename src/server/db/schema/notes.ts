import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { users } from './users'
import { issues } from './issues'
import { projects } from './projects'
import { projectWorkers } from './project-workers'

export const notes = pgTable('notes', {
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
  projectWorkerId: uuid('project_worker_id').references(
    () => projectWorkers.id,
    { onDelete: 'set null' },
  ),
  title: text('title').notNull(),
  content: text('content').notNull(), // markdown content
  position: integer('position').notNull().default(0), // for tab ordering
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
