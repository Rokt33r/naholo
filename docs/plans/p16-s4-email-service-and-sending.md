# P16-S4: Email Service & Sending

## Goal

Create the service layer and API routes for reading received emails and sending new emails via SES.

## Progress

- [ ] 4.1 Email service
- [ ] 4.2 Email API routes

---

### 4.1 Email service

**File:** `src/server/services/naholo-email.ts`

```typescript
// Reading
export async function getNaholoEmail(
  userId: string,
): Promise<NaholoEmail | null>
export async function listReceivedEmails(
  userId: string,
  opts?: { limit?: number; offset?: number },
): Promise<ReceivedEmail[]>
export async function getReceivedEmail(
  userId: string,
  emailId: string,
): Promise<ReceivedEmailDetail | null>
export async function markEmailAsRead(
  userId: string,
  emailId: string,
): Promise<ReturnResult<undefined>>

// Sending
export async function sendEmail(
  userId: string,
  data: { to: string; subject: string; body: string },
): Promise<ReturnResult<{ id: string }>>

// Count
export async function getUnreadCount(userId: string): Promise<number>
```

`sendEmail` logic:

1. Look up user's `naholoEmail` to get their `from` address
2. Send via SES using existing `SESClient` (reuse pattern from `ses-mailer.ts`)
3. Store in `naholoSentEmails`

Auth scoping: all functions verify the user has an assigned naholo email before proceeding.

### 4.2 Email API routes

**File:** `src/app/api/email/received/route.ts`

```
GET /api/email/received              → listReceivedEmails(userId)
```

**File:** `src/app/api/email/received/[emailId]/route.ts`

```
GET   /api/email/received/:emailId   → getReceivedEmail(userId, emailId)
PATCH /api/email/received/:emailId   → markEmailAsRead(userId, emailId)
```

**File:** `src/app/api/email/send/route.ts`

```
POST /api/email/send                 → sendEmail(userId, { to, subject, body })
```

All email API routes check that the user has a naholo email assigned (via `getNaholoEmail(userId)`). Return 403 if not.

## Files

| File                                            | Action                            |
| ----------------------------------------------- | --------------------------------- |
| `src/server/services/naholo-email.ts`           | **Create** — email service        |
| `src/app/api/email/received/route.ts`           | **Create** — list received emails |
| `src/app/api/email/received/[emailId]/route.ts` | **Create** — get/mark read        |
| `src/app/api/email/send/route.ts`               | **Create** — send email           |
