# P16-S5: Email UI

## Goal

Build the user-facing email pages under `/app/email` — inbox list, email detail view, and compose form.

## Progress

- [ ] 5.1 Email layout
- [ ] 5.2 Email list page
- [ ] 5.3 Email detail page
- [ ] 5.4 Compose page
- [ ] 5.5 App mode sidebar integration

---

### 5.1 Email layout

**Route:** `/app/email`
**File:** `src/app/app/email/layout.tsx`

Guard: check user has naholo email. If not, show a "No email assigned" message (not a 404, but a friendly empty state).

Layout: two-panel (email list on left, email detail on right) — same resizable panel pattern as issues.

### 5.2 Email list page

**Route:** `/app/email` (default — shows received list)
**File:** `src/app/app/email/page.tsx`

Displays received emails in a list:

- Each row: sender, subject, date, read/unread indicator
- Click to navigate to `/app/email/[emailId]`
- Sorted by `receivedAt` descending
- "Compose" button in header opens compose page

### 5.3 Email detail page

**Route:** `/app/email/[emailId]`
**File:** `src/app/app/email/[emailId]/page.tsx`

Shows:

- From, To, Subject, Date
- Email body (prefer HTML rendered in iframe/sandbox, fallback to plain text)
- Mark as read on open (auto via API call)

### 5.4 Compose page

**Route:** `/app/email/compose`
**File:** `src/app/app/email/compose/page.tsx`

Form fields:

- **To** — email input
- **Subject** — text input
- **Body** — textarea (plain text for now; markdown support later)
- **Send** button

On submit: `POST /api/email/send` → on success redirect to `/app/email`

### 5.5 App mode sidebar integration

After P15 lands, add an email icon (`Mail`) to `AppModeSidebar`:

- Only visible to users with an assigned naholo email
- Links to `/app/email`
- Shows unread badge count

## Files

| File                                      | Action                                |
| ----------------------------------------- | ------------------------------------- |
| `src/app/app/email/layout.tsx`            | **Create** — email layout with guard  |
| `src/app/app/email/page.tsx`              | **Create** — email list               |
| `src/app/app/email/[emailId]/page.tsx`    | **Create** — email detail             |
| `src/app/app/email/compose/page.tsx`      | **Create** — compose form             |
| `src/components/app/app-mode-sidebar.tsx` | **Edit** — add email icon (after P15) |
