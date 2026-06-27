import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { userIdentifiers } from './user-identifiers'
import { userNotificationEmails } from './user-notification-emails'
import { projectOperators } from './project-operators'

export const users = pgTable('users', {
  id: uuidV7IdColumn(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const usersRelations = relations(users, ({ one, many }) => ({
  identifiers: many(userIdentifiers),
  projectOperators: many(projectOperators),
  notificationEmail: one(userNotificationEmails, {
    fields: [users.id],
    references: [userNotificationEmails.userId],
  }),
}))
