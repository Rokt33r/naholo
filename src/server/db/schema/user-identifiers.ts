import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { users } from './users'

export const userIdentifiers = pgTable(
  'user_identifiers',
  {
    id: uuidV7IdColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // e.g., "email-otp"
    value: text('value').notNull(), // e.g., "user@example.com"
    data: jsonb('data'), // additional metadata from provider
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [unique('type_value').on(table.type, table.value)],
)

export const userIdentifiersRelations = relations(
  userIdentifiers,
  ({ one }) => ({
    user: one(users, {
      fields: [userIdentifiers.userId],
      references: [users.id],
    }),
  }),
)
