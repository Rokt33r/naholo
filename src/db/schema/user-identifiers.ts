import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const userIdentifiers = pgTable(
  'user_identifiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // e.g., "email-otp"
    value: text('value').notNull(), // e.g., "user@example.com"
    data: jsonb('data'), // additional metadata from provider
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    typeValueUnique: unique().on(table.type, table.value),
  }),
)
