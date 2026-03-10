# P16-S3: AWS SES Receiving Pipeline

## Goal

Set up AWS infrastructure and an internal webhook so that emails sent to `*@naholo.app` are received, parsed, and stored in the database.

## Progress

- [ ] 3.1 Architecture
- [ ] 3.2 Internal webhook API
- [ ] 3.3 Lambda code
- [ ] 3.4 New env vars

---

### 3.1 Architecture

```
Incoming email → SES Receipt Rule → S3 (raw storage) → Lambda → Naholo API
```

1. **SES Receipt Rule Set** (region: us-east-1 or us-west-2 — SES receiving only available in select regions)
   - Domain: `naholo.app`
   - MX record: `10 inbound-smtp.<region>.amazonaws.com`
   - Rule actions:
     1. **S3 action** — store raw email to `s3://naholo-emails-inbound/{messageId}`
     2. **Lambda action** — invoke processing Lambda

2. **S3 Bucket** (`naholo-emails-inbound`)
   - Stores raw `.eml` files
   - Lifecycle rule: delete after 90 days (configurable)
   - Bucket policy allows SES to write

3. **Lambda function** (`naholo-email-processor`)
   - Triggered by SES receipt rule
   - Parses SES event to extract: from, to, subject, messageId, s3 key
   - Calls Naholo internal API to store the email

### 3.2 Internal webhook API

**File:** `src/app/api/internal/email/receive/route.ts`

```
POST /api/internal/email/receive
```

Protected by a shared secret header (`X-Internal-Secret` checked against `INTERNAL_API_SECRET` env var).

Request body (from Lambda):

```json
{
  "to": "keyword@naholo.app",
  "from": "sender@example.com",
  "subject": "Hello",
  "bodyText": "...",
  "bodyHtml": "...",
  "s3Key": "messageId"
}
```

Logic:

1. Look up `naholoEmails` by `to` address
2. If found, insert into `naholoReceivedEmails`
3. If not found, discard (or log)

### 3.3 Lambda code

**File:** `infra/lambda/email-processor/index.ts` (separate from Next.js app)

Lightweight Node.js Lambda:

- Parses SES event notification
- Optionally fetches raw email from S3 to extract body text/html (using `mailparser`)
- POSTs to Naholo internal API

### 3.4 New env vars

**File:** `src/server/config.ts`

```typescript
// Internal API
internalApiSecret: getRequiredEnv('INTERNAL_API_SECRET'),

// Email domain
emailDomain: getOptionalEnv('EMAIL_DOMAIN', 'naholo.app'),
```

## Files

| File                                          | Action                                       |
| --------------------------------------------- | -------------------------------------------- |
| `src/server/config.ts`                        | **Edit** — add internal secret, email domain |
| `src/app/api/internal/email/receive/route.ts` | **Create** — webhook for Lambda              |
| `infra/lambda/email-processor/index.ts`       | **Create** — Lambda function                 |

## AWS Resources

| Resource                            | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| SES domain identity (`naholo.app`)  | Receive emails                                        |
| SES receipt rule set                | Route incoming email to S3 + Lambda                   |
| S3 bucket (`naholo-emails-inbound`) | Store raw `.eml` files                                |
| Lambda (`naholo-email-processor`)   | Parse SES event + call webhook                        |
| IAM roles                           | Lambda → S3 read, SES → S3 write, SES → Lambda invoke |
| MX DNS record                       | `10 inbound-smtp.<region>.amazonaws.com`              |
