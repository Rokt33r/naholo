# P16-S1: Admin Role & Admin Pages

## Goal

Introduce an admin role system and create admin pages under `/app/admin` that are invisible (404) to non-admin users.

## Progress

- [ ] 1.1 Create `admin_users` table
- [ ] 1.2 Admin promotion script
- [ ] 1.3 Auth utilities for admin
- [ ] 1.4 Admin layout & route guard
- [ ] 1.5 Admin users page
- [ ] 1.6 Admin service
- [ ] 1.7 Admin API routes

---

### 1.1 Create `admin_users` table

**File:** `src/server/db/schema/admin-users.ts` (new)

A separate table that marks a user as admin by reference:

```typescript
export const adminUsers = pgTable('admin_users', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

Export from `src/server/db/schema/index.ts`.

Generate and run a Drizzle migration (`npm run db:generate && npm run db:migrate`).

### 1.2 Admin promotion script

**File:** `scripts/promote-admin.ts`

A CLI script that:

1. Accepts a user ID (UUID) as argument
2. Queries the user from `users` + `user_identifiers` (email, Google)
3. Checks if already in `admin_users`
4. Prints user info: name, identifiers, admin status
5. Prompts for confirmation (`y/N`)
6. Inserts into `admin_users` on confirm

Run via: `npx tsx scripts/promote-admin.ts <user-id>`

### 1.3 Auth utilities for admin

**File:** `src/server/auth/utils.ts`

`getAuthUser` stays unchanged — no `isAdmin` field. The admin check is isolated to `requireAdminOrNotFound`.

Add a new guard function that fetches admin status itself:

```typescript
export async function requireAdminOrNotFound(): Promise<{
  id: string
  name: string
}> {
  const user = await getAuthUser()
  if (!user) {
    notFound()
  }
  const adminRow = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, user.id))
    .limit(1)
  if (adminRow.length === 0) {
    notFound() // admin pages invisible to non-admins
  }
  return user
}
```

### 1.4 Admin layout & route guard

**File:** `src/app/app/admin/layout.tsx`

```typescript
export default async function AdminLayout({ children }) {
  await requireAdminOrNotFound()
  return <>{children}</>
}
```

All pages under `/app/admin/` automatically 404 for non-admins.

### 1.5 Admin users page

**Route:** `/app/admin` (redirects to `/app/admin/users`)
**Route:** `/app/admin/users`

**File:** `src/app/app/admin/page.tsx` — redirect to `/app/admin/users`
**File:** `src/app/app/admin/users/page.tsx`

Displays a table of all users:

| Column       | Source                                           |
| ------------ | ------------------------------------------------ |
| Name         | `users.name`                                     |
| Email        | `user_identifiers` where `type = 'email-otp'`    |
| Google       | `user_identifiers` where `type = 'google-oauth'` |
| Admin        | exists in `admin_users`                          |
| Naholo Email | `naholo_emails.email` (from Stage 2)             |
| Created      | `users.createdAt`                                |

Each row has an action menu:

- **Assign email** — opens dialog to set `<keyword>@naholo.app`
- **Remove email** — removes assigned email

### 1.6 Admin service

**File:** `src/server/services/admin.ts`

```typescript
export async function listAllUsers(): Promise<AdminUser[]>
export async function getUserWithIdentifiers(
  userId: string,
): Promise<AdminUserDetail | null>
export async function assignNaholoEmail(
  userId: string,
  keyword: string,
): Promise<ReturnResult<{ email: string }>>
export async function removeNaholoEmail(
  userId: string,
): Promise<ReturnResult<undefined>>
```

`listAllUsers` joins `users` with `user_identifiers`, `admin_users`, and `naholo_emails` to build the admin table view.

### 1.7 Admin API routes

**File:** `src/app/api/admin/users/route.ts`

```
GET  /api/admin/users          → listAllUsers()
```

**File:** `src/app/api/admin/users/[userId]/naholo-email/route.ts`

```
PUT    /api/admin/users/:userId/naholo-email   → assignNaholoEmail(userId, keyword)
DELETE /api/admin/users/:userId/naholo-email   → removeNaholoEmail(userId)
```

All admin API routes check `requireAdminOrNotFound()` before processing.

## Files

| File                                                     | Action                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/server/db/schema/admin-users.ts`                    | **Create** — `admin_users` table                                    |
| `scripts/promote-admin.ts`                               | **Create** — CLI admin promotion                                    |
| `src/server/auth/utils.ts`                               | **Edit** — add `isAdmin` to auth user, add `requireAdminOrNotFound` |
| `src/app/app/admin/layout.tsx`                           | **Create** — admin layout guard                                     |
| `src/app/app/admin/page.tsx`                             | **Create** — redirect to users                                      |
| `src/app/app/admin/users/page.tsx`                       | **Create** — admin users table                                      |
| `src/server/services/admin.ts`                           | **Create** — admin service                                          |
| `src/app/api/admin/users/route.ts`                       | **Create** — admin users API                                        |
| `src/app/api/admin/users/[userId]/naholo-email/route.ts` | **Create** — assign/remove naholo email API                         |
