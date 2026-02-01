import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'

export const emailOtps = pgTable('email_otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  signature: text('signature').notNull(),
  used: boolean('used').notNull().default(false),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
