import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { users } from './users'

export const sessions = pgTable('sessions', {
  id: uuidV7IdColumn(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  invalidated: boolean('invalidated').notNull().default(false),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  refreshedAt: timestamp('refreshed_at').notNull().defaultNow(),
  usedAt: timestamp('used_at').notNull().defaultNow(),
  invalidatedAt: timestamp('invalidated_at'),
})
