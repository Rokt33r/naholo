import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { users } from './users'

export const cliLoginRequests = pgTable('cli_login_requests', {
  id: uuidV7IdColumn(),
  state: text('state').notNull().unique(),
  words: text('words').notNull(),
  code: text('code'),
  codeExpiresAt: timestamp('code_expires_at'),
  userId: uuid('user_id').references(() => users.id),
  callbackUrl: text('callback_url').notNull(),
  ipAddress: text('ip_address').notNull(),
  consumedAt: timestamp('consumed_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const cliLoginRequestsRelations = relations(
  cliLoginRequests,
  ({ one }) => ({
    user: one(users, {
      fields: [cliLoginRequests.userId],
      references: [users.id],
    }),
  }),
)
