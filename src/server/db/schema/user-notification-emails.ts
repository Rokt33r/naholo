import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { users } from './users'

export const userNotificationEmails = pgTable(
  'user_notification_emails',
  {
    id: uuidV7IdColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [unique('user_notification_emails_user_id').on(table.userId)],
)

export const userNotificationEmailsRelations = relations(
  userNotificationEmails,
  ({ one }) => ({
    user: one(users, {
      fields: [userNotificationEmails.userId],
      references: [users.id],
    }),
  }),
)
