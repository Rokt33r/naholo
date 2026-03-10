# P16-S2: Email Schema & Assignment

## Goal

Create the database tables for naholo email addresses, received emails, and sent emails.

## Progress

- [ ] 2.1 `naholo_emails` table
- [ ] 2.2 `naholo_received_emails` table
- [ ] 2.3 `naholo_sent_emails` table
- [ ] 2.4 Export schemas

---

### 2.1 `naholo_emails` table

**File:** `src/server/db/schema/naholo-emails.ts`

```typescript
export const naholoEmails = pgTable('naholo_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  email: text('email').notNull().unique(), // e.g. 'keyword@naholo.app'
  keyword: text('keyword').notNull().unique(), // e.g. 'keyword'
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

Constraints:

- One email per user (`userId` unique)
- One keyword per email (`keyword` unique)
- `email` is derived as `${keyword}@naholo.app`

### 2.2 `naholo_received_emails` table

**File:** `src/server/db/schema/naholo-emails.ts` (same file)

```typescript
export const naholoReceivedEmails = pgTable('naholo_received_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  naholoEmailId: uuid('naholo_email_id')
    .notNull()
    .references(() => naholoEmails.id, { onDelete: 'cascade' }),
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  subject: text('subject').notNull().default(''),
  bodyText: text('body_text'), // plain text body
  bodyHtml: text('body_html'), // HTML body
  s3Key: text('s3_key'), // S3 key for raw email (from SES receipt)
  read: boolean('read').notNull().default(false),
  receivedAt: timestamp('received_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

### 2.3 `naholo_sent_emails` table

**File:** `src/server/db/schema/naholo-emails.ts` (same file)

```typescript
export const naholoSentEmails = pgTable('naholo_sent_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  naholoEmailId: uuid('naholo_email_id')
    .notNull()
    .references(() => naholoEmails.id, { onDelete: 'cascade' }),
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  subject: text('subject').notNull().default(''),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  sesMessageId: text('ses_message_id'), // SES response MessageId
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

### 2.4 Export schemas

**File:** `src/server/db/schema/index.ts` — add `export * from './naholo-emails'`

## Files

| File                                    | Action                              |
| --------------------------------------- | ----------------------------------- |
| `src/server/db/schema/naholo-emails.ts` | **Create** — all three email tables |
| `src/server/db/schema/index.ts`         | **Edit** — export new schema        |
