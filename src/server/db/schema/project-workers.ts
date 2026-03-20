import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { users } from './users'

export const projectWorkers = pgTable('project_workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type').notNull().default('user'), // 'user' | 'bot'
  name: text('name').notNull(),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
