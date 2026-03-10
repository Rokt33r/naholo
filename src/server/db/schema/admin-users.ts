import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const adminUsers = pgTable('admin_users', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
