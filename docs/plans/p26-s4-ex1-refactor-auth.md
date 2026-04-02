# P26-S4-EX1: Refactor Auth Utils

## Goal

Extract permission-checking functions from `src/server/auth/utils.ts` into a dedicated `permissions.ts` file, merge `requireAuthOrRedirect` into `requireAuthUser` via options, rename `requireAdminOrNotFound` → `requireAppAdmin`, and fix all import sites (no re-exports).

## Prerequisites

- [x] P26-S4: User API tokens, CLI login, and auth middleware (completed — all Tasks 1–6)

## Motivation

`src/server/auth/utils.ts` has grown to ~347 lines mixing three concerns:

1. **Request metadata** (`getRequestMetadata`) — generic HTTP utility
2. **Auth resolution** (`getAuthUser`, `requireAuthUser`) — "who is this caller?"
3. **Permission guards** (`requireAuthOrRedirect`, `requireAdminOrNotFound`, `requireProjectWorker`, etc.) — "is this caller allowed?"

The naming is also misleading:

- `getAuthUser` only resolves from **session**, yet `requireAuthUser` resolves from **both** session and user API tokens.
- `requireAuthOrRedirect` is really just `requireAuthUser` with a redirect behavior.
- `requireAdminOrNotFound` doesn't describe what it's checking (app-level admin).
- The `require*` functions aren't "utils" — they're the core permission layer.

## Architecture Decisions

- **New file `src/server/auth/permissions.ts`**: All auth-resolution and permission functions move here. `utils.ts` is left with only `getRequestMetadata()`.
- **No re-exports**: All 32 import sites are updated from `@/server/auth/utils` to `@/server/auth/permissions`. No tech debt.
- **Merge `requireAuthOrRedirect` into `requireAuthUser`** via options:
  ```ts
  interface RequireGetAuthUserOptions {
    allowedAuthMethods?: ('session' | 'user-api-token')[] // default: ['session', 'user-api-token']
    redirectUrlOnFail?: string // If provided, redirect on fail. Otherwise throw 401.
  }
  ```

  - Current `requireAuthOrRedirect()` callers become `requireAuthUser({ allowedAuthMethods: ['session'], redirectUrlOnFail: '/sign-in' })`
  - Current `requireAuthUser()` callers (API routes) keep using `requireAuthUser()` with defaults
- **Rename `requireAdminOrNotFound` → `requireAppAdmin`**: Clearer name for app-level admin check. Uses `notFound()` to hide admin routes from non-admins (unchanged behavior).
- **Rename `getAuthUser` → `getAuthUserBySession`**: Make it explicit that it only resolves from session. **Private** — not exported, used internally by `getAuthUser`, `requireAuthUser`, `requireAppAdmin`, and `requireProjectWorkerBySession`.
- **New `getAuthUser(options?)`**: Resolves from session and/or user API token based on `allowedAuthMethods` option (returns null). Shares the same `allowedAuthMethods` option as `requireAuthUser`.

## Current File Structure (before)

```
src/server/auth/utils.ts (347 lines, everything)
├── getRequestMetadata()              — HTTP utility
├── getAuthUser()                     — session-only resolution (cached)
├── requireAuthUser()                 — session + user token resolution (throws)
├── requireAuthOrRedirect()           — session + redirect
├── requireAdminOrNotFound()          — session + admin check
├── requireAdminProjectWorker()       — project worker + admin role
├── requireProjectWorker()            — 3-way auth (worker token / user token / session)
│   ├── requireProjectWorkerByApiToken()       (private)
│   ├── requireProjectWorkerByUserApiToken()   (private)
│   └── requireProjectWorkerBySession()        (private)
├── requireIssueAccess()              — project worker + issue ownership
├── requireIssueLogAccess()           — + log ownership
├── requireIssueNoteAccess()          — + note ownership
└── requireIssueTaskAccess()          — + task ownership
```

## Target File Structure (after)

```
src/server/auth/utils.ts (~40 lines)
└── getRequestMetadata()              — HTTP utility (unchanged)

src/server/auth/permissions.ts (~300 lines)
├── getAuthUserBySession()            — session-only resolution (cached, private) [renamed from getAuthUser]
├── getAuthUser(options?)             — session + user token resolution (returns null) [NEW]
├── requireAuthUser(options?)         — flexible auth + redirect/throw [merges requireAuthOrRedirect]
├── requireAppAdmin()                 — session + admin check [renamed from requireAdminOrNotFound]
├── requireProjectWorker(projectId)
├── requireAdminProjectWorker(projectId)
│   ├── requireProjectWorkerByApiToken()       (private)
│   ├── requireProjectWorkerByUserApiToken()   (private)
│   └── requireProjectWorkerBySession()        (private)
├── requireIssueAccess()
├── requireIssueLogAccess()
├── requireIssueNoteAccess()
└── requireIssueTaskAccess()
```

## Tasks

### Task 1: Create `permissions.ts` with all auth + permission functions

- [x] `src/server/auth/permissions.ts` — new file with all exports:
  - Imports needed:
    - `headers` from `'next/headers'`
    - `notFound, redirect` from `'next/navigation'`
    - `cache` from `'react'`
    - `auth` from `'./auth'`
    - `db` from `'../db'`
    - `resolveProjectWorkerByApiToken, touchProjectWorkerApiToken` from `'../services/project-worker-api-token'`
    - `resolveProjectWorkerByUserIdAndProjectId, getProjectWorker, type ProjectWorker` from `'../services/project-worker'`
    - `resolveUserByApiToken, touchUserApiToken` from `'../services/user-api-token'`
    - `NotFoundError` from `'../services/errors'`
  - Re-export `ProjectWorker` type: `export type { ProjectWorker } from '../services/project-worker'`

  **Shared options type:**

  ```ts
  type AuthMethod = 'session' | 'user-api-token'

  interface GetAuthUserOptions {
    allowedAuthMethods?: AuthMethod[] // default: ['session', 'user-api-token']
  }

  interface RequireGetAuthUserOptions extends GetAuthUserOptions {
    redirectUrlOnFail?: string // If set, redirect instead of throwing
  }
  ```

  **Auth resolution functions:**
  - `getAuthUserBySession()` — **private**, moved from `utils.ts`, renamed from `getAuthUser`. `cache()`-wrapped, session-only, returns `{ id: string; name: string } | null`
  - `getAuthUser(options?: GetAuthUserOptions)` — **new exported function**:
    - When `allowedAuthMethods` includes `'user-api-token'`: check `Authorization` header for `Bearer naholo_user_` prefix → resolve via `resolveUserByApiToken()`, fire-and-forget `touchUserApiToken()`, look up user via `auth.storage.getUserById()`, return `{ id, name }` or null
    - When `allowedAuthMethods` includes `'session'`: fall back to `getAuthUserBySession()`
    - Default `allowedAuthMethods`: `['session', 'user-api-token']`
    - Return type: `Promise<{ id: string; name: string } | null>`
    - **Not cached** (reads headers)
  - `requireAuthUser(options?: RequireGetAuthUserOptions)`:
    - Calls `getAuthUser({ allowedAuthMethods: options?.allowedAuthMethods })` internally
    - On failure: if `redirectUrlOnFail` is set, call `redirect(redirectUrlOnFail)`. Otherwise, `throw new Error('Unauthorized')`

  **Permission functions (moved, logic unchanged unless noted):**
  - `requireAppAdmin()` — renamed from `requireAdminOrNotFound`. Same behavior: calls `getAuthUserBySession()`, checks `adminUsers` table, calls `notFound()` on failure. Returns `{ id: string; name: string }`.
  - `requireProjectWorker(projectId)` — unchanged logic
  - `requireAdminProjectWorker(projectId)` — unchanged logic
  - `requireIssueAccess(projectId, issueId)` — unchanged logic
  - `requireIssueLogAccess(projectId, issueId, logId)` — unchanged logic
  - `requireIssueNoteAccess(projectId, issueId, noteId)` — unchanged logic
  - `requireIssueTaskAccess(projectId, issueId, taskId)` — unchanged logic

  **Private helpers (moved unchanged):**
  - `requireProjectWorkerByApiToken(projectId, token)`
  - `requireProjectWorkerByUserApiToken(projectId, token, headersList)`
  - `requireProjectWorkerBySession(projectId)` — calls `getAuthUserBySession()` instead of old `getAuthUser()`

### Task 2: Slim down `utils.ts`

- [x] `src/server/auth/utils.ts` — remove everything except `getRequestMetadata()`:
  - Remove all imports no longer needed (keep only `headers` from `'next/headers'`)
  - Remove `getAuthUser`, `requireAuthUser`, `requireAuthOrRedirect`, `requireAdminOrNotFound`, `requireProjectWorker`, `requireAdminProjectWorker`, `requireIssueAccess`, `requireIssueLogAccess`, `requireIssueNoteAccess`, `requireIssueTaskAccess`, and all private helpers
  - Keep `getRequestMetadata()` unchanged

### Task 3: Update all import sites

Update all 32 files that import from `@/server/auth/utils` to import from `@/server/auth/permissions` instead. Apply renames where needed.

**Files importing `getAuthUser` → keep as `getAuthUser` (new combined version) from `permissions`:**

- [x] `src/app/page.tsx` — `getAuthUser` from `'@/server/auth/permissions'`
- [x] `src/app/api/projects/route.ts` — `getAuthUser` from `'@/server/auth/permissions'`
- [x] `src/app/auth/cli/confirm/[requestId]/page.tsx` — `getAuthUser` from `'@/server/auth/permissions'`
- [x] `src/app/(auth)/sign-in/page.tsx` — `getAuthUser` from `'@/server/auth/permissions'`
- [x] `src/app/(auth)/sign-up/page.tsx` — `getAuthUser` from `'@/server/auth/permissions'`
- [x] `src/app/api/auth/cli/confirm/[requestId]/route.ts` — `getAuthUser` from `'@/server/auth/permissions'`
- [x] `src/app/app/actions.ts` — `getAuthUser` (+ `requireAdminProjectWorker`, `requireProjectWorker`, `requireIssueAccess`) from `'@/server/auth/permissions'`

**Files importing `requireAuthOrRedirect` → change to `requireAuthUser` with options:**

- [x] `src/app/app/page.tsx` — `requireAuthUser` from `'@/server/auth/permissions'`, call as `requireAuthUser({ allowedAuthMethods: ['session'], redirectUrlOnFail: '/sign-in' })`
- [x] `src/app/app/layout.tsx` — same pattern as above

**Files importing `requireAdminOrNotFound` → change to `requireAppAdmin`:**

- [x] `src/app/admin/layout.tsx` — `requireAppAdmin` from `'@/server/auth/permissions'`
- [x] `src/app/api/admin/users/route.ts` — `requireAppAdmin` from `'@/server/auth/permissions'`

**Files importing `requireAuthUser` → keep name, change source:**

- [x] `src/app/api/auth/user/route.ts` — `requireAuthUser` from `'@/server/auth/permissions'`
- [x] `src/app/api/auth/user/token/route.ts` — `requireAuthUser` from `'@/server/auth/permissions'`

**Files importing `getRequestMetadata` → keep importing from `utils`:**

- `src/app/api/auth/cli/requests/route.ts` — no change needed (stays `@/server/auth/utils`)
- `src/app/api/auth/cli/exchange/route.ts` — no change needed (stays `@/server/auth/utils`)

**Files importing `requireProjectWorker` → change source only:**

- [x] `src/app/api/projects/[projectId]/route.ts`
- [x] `src/app/api/projects/[projectId]/issues/route.ts`
- [x] `src/app/api/projects/[projectId]/skills/route.ts`
- [x] `src/app/api/projects/[projectId]/skills/[skillId]/route.ts`
- [x] `src/app/api/projects/[projectId]/workers/route.ts`
- [x] `src/app/api/projects/[projectId]/workers/[workerId]/route.ts`
- [x] `src/app/api/projects/[projectId]/workers/[workerId]/tokens/route.ts`
- [x] `src/app/api/projects/[projectId]/workers/[workerId]/tokens/[tokenId]/route.ts`

**Files importing `requireIssueAccess` → change source only:**

- [x] `src/app/api/projects/[projectId]/issues/[issueId]/route.ts`
- [x] `src/app/api/projects/[projectId]/issues/[issueId]/close/route.ts`
- [x] `src/app/api/projects/[projectId]/issues/[issueId]/notes/route.ts`
- [x] `src/app/api/projects/[projectId]/issues/[issueId]/tasks/route.ts`
- [x] `src/app/api/projects/[projectId]/issues/[issueId]/logs/route.ts`

**Files importing `requireIssueTaskAccess` → change source only:**

- [x] `src/app/api/projects/[projectId]/issues/[issueId]/tasks/[taskId]/route.ts`
- [x] `src/app/api/projects/[projectId]/issues/[issueId]/tasks/[taskId]/move/route.ts`

**Files importing `requireIssueLogAccess` → change source only:**

- [x] `src/app/api/projects/[projectId]/issues/[issueId]/logs/[logId]/route.ts`

**Files importing `requireIssueNoteAccess` → change source only:**

- [x] `src/app/api/projects/[projectId]/issues/[issueId]/notes/[noteId]/route.ts`

**Files importing `requireAdminProjectWorker` → change source only:**

- [x] `src/app/api/projects/[projectId]/skills/route.ts` (also imports `requireProjectWorker`)
- [x] `src/app/api/projects/[projectId]/skills/[skillId]/route.ts` (also imports `requireProjectWorker`, `requireAdminProjectWorker`)

## Notes

- **`getAuthUserBySession` is private** — used internally by `getAuthUser`, `requireAppAdmin`, and `requireProjectWorkerBySession`. Not exported.
- **`requireAppAdmin` uses `getAuthUserBySession`** (not `getAuthUser`): Admin pages are always session-based. API tokens should not grant admin access.
- **`requireProjectWorkerBySession` uses `getAuthUserBySession`**: Same reasoning — session context only when no Bearer token is present.
- **The new `getAuthUser` is not cached**: Unlike `getAuthUserBySession` (which is `cache()`-wrapped for React request deduplication), it reads headers and shouldn't be cached since it may be called in API route contexts where caching semantics differ.
- The `sign-in/page.tsx` and `sign-up/page.tsx` currently use `getAuthUser` to check if already logged in (redirect away from auth pages). The new `getAuthUser` (session + token) works fine here — if anything it's more correct.
