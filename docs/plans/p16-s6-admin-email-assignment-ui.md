# P16-S6: Admin Email Assignment UI

## Goal

Build the client-side admin components and React Query hooks for assigning/removing naholo emails from the admin users table.

## Progress

- [ ] 6.1 Assign email dialog
- [ ] 6.2 React Query hooks

---

### 6.1 Assign email dialog

**File:** `src/components/admin/assign-email-dialog.tsx`

A dialog triggered from the admin users table:

- Input: keyword field (alphanumeric + hyphens, lowercase)
- Preview: `{keyword}@naholo.app`
- Validation: keyword format, uniqueness (server-side)
- Submit: `PUT /api/admin/users/:userId/email`

### 6.2 React Query hooks

**File:** `src/hooks/use-admin-users.ts`

```typescript
export function useAdminUsers() // list all users
export function useAssignEmail() // mutation: assign email
export function useRemoveEmail() // mutation: remove email
```

**File:** `src/hooks/use-naholo-email.ts`

```typescript
export function useReceivedEmails() // list received
export function useReceivedEmail(id) // single email detail
export function useSendEmail() // mutation: send
export function useUnreadCount() // unread badge
```

## Files

| File                                           | Action                               |
| ---------------------------------------------- | ------------------------------------ |
| `src/components/admin/assign-email-dialog.tsx` | **Create** — assign email dialog     |
| `src/hooks/use-admin-users.ts`                 | **Create** — admin React Query hooks |
| `src/hooks/use-naholo-email.ts`                | **Create** — email React Query hooks |
