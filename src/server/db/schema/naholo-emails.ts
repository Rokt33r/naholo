import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'

export const naholoEmailAddresses = pgTable('naholo_email_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  address: text('address').notNull().unique(), // e.g. 'keyword@naholo.app'
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const naholoReceivedEmails = pgTable('naholo_received_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  naholoEmailAddressId: uuid('naholo_email_address_id')
    .notNull()
    .references(() => naholoEmailAddresses.id, { onDelete: 'cascade' }),
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  subject: text('subject').notNull().default(''),
  bodyText: text('body_text'), // plain text body
  bodyHtml: text('body_html'), // HTML body
  s3Key: text('s3_key'), // S3 key for raw email (from SES receipt)
  receivedAt: timestamp('received_at').notNull().defaultNow(),
})

export const naholoSentEmails = pgTable('naholo_sent_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  naholoEmailAddressId: uuid('naholo_email_address_id')
    .notNull()
    .references(() => naholoEmailAddresses.id, { onDelete: 'cascade' }),
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  subject: text('subject').notNull().default(''),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  sesMessageId: text('ses_message_id'), // SES response MessageId
  sentAt: timestamp('sent_at').notNull().defaultNow(),
})
