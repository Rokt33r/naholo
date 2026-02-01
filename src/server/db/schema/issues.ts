import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { projects } from './projects'

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  lastLogPreview: text('last_log_preview'),
  closed: boolean('closed').notNull().default(false),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
