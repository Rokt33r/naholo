# P26-S4: User API Tokens & CLI Login

## Goal

Introduce user-scoped API tokens (separate from project worker tokens) so the CLI can authenticate as a user across all their projects. Add an OAuth-like login flow for the CLI.

## Motivation

Worker API tokens are per-project and per-worker — requiring a separate token for every cloned repo makes token management impractical. User API tokens are per-user and work across all projects the user has access to, similar to how `gh` auth tokens work.

## Prerequisites

- Existing project worker API token infrastructure (`src/server/services/project-worker-api-token.ts`, `src/server/db/schema/project-worker-api-tokens.ts`)
- Auth system with session-based login via Email OTP and Google OAuth (`src/server/auth/`, `src/app/(auth)/`)

## Architecture Decisions

- **Global config**: `~/.naholo/config.yml` stores `defaultProfile` pointer
- **Profiles**: `~/.naholo/profiles/{name}.yml` stores `baseUrl` and `token` per server
- **OAuth-like login**: CLI opens browser, user approves, CLI receives token via localhost callback (same pattern as gunship CLI from the reference design in `px-better-cli-design.md`)
- **User API tokens table**: New `user_api_tokens` table, separate from project worker tokens
- **Token prefix**: `naholo_user_` to distinguish from worker tokens (`naholo_`)
- **returnTo support**: Thread `returnTo` query param through sign-in flows (Email OTP + Google OAuth) with open redirect prevention via allowlist of relative paths starting with `/`

## Config Structure

```
~/.naholo/
├── config.yml          # defaultProfile: path-to-profile
└── profiles/
    └── {name}.yml      # baseUrl, token, createdAt
```

### `~/.naholo/config.yml`

```yaml
defaultProfile: { profileName }
```

### `~/.naholo/profiles/{name}.yml`

```yaml
baseUrl: https://naholo.example.com
token: naholo_user_...
tokenName: alice@macbook
createdAt: 2026-03-28T00:00:00Z
```

## Data Model

### `user_api_tokens` table

```
id            uuid        PK, default random
user_id       uuid        FK → users.id ON DELETE CASCADE, NOT NULL
name          text        NOT NULL (e.g., "alice@macbook")
token_hash    text        NOT NULL, UNIQUE
token_hint    text        NOT NULL (first 8 chars + prefix + "..." for display, same pattern as project worker tokens)
last_used_at  timestamp   NULL
created_at    timestamp   NOT NULL, default now()
```

### `cli_login_requests` table

```
id              uuid        PK, default random
state           text        NOT NULL, UNIQUE
words           text        NOT NULL (human-readable verification phrase, e.g. "brave-ocean-tiger")
code            text        NULL (set on confirm)
code_expires_at timestamp   NULL (60s after confirm)
user_id         uuid        NULL FK → users.id (set on confirm)
callback_url    text        NOT NULL (must be localhost)
ip_address      text        NOT NULL (requester's IP, verified again on exchange)
consumed_at     timestamp   NULL (set when token is issued)
expires_at      timestamp   NOT NULL (10 min from creation)
created_at      timestamp   NOT NULL, default now()
```

## Login Flow

```
CLI                     Route                          Service                        DB
 │                        │                              │                             │
 │ POST /api/auth/cli/    │                              │                             │
 │   requests             │                              │                             │
 │  {state, callbackUrl}  │                              │                             │
 ├───────────────────────>│  createCliLoginRequest()     │                             │
 │                        ├─────────────────────────────>│  generateReadableWords()    │
 │                        │                              │  INSERT cli_login_requests  │
 │                        │                              ├────────────────────────────>│
 │<───────────────────────┤                              │                             │
 │  {requestId, words}    │                              │                             │
 │                        │                              │                             │
 │  (open browser)        │                              │                             │
 │                        │                              │                             │
Browser                   │                              │                             │
 │ GET /auth/cli/         │                              │                             │
 │   confirm/:requestId   │                              │                             │
 ├───────────────────────>│  getCliLoginRequestById()    │                             │
 │                        ├─────────────────────────────>│  SELECT WHERE not expired   │
 │                        │                              ├────────────────────────────>│
 │  (if not logged in)    │                              │                             │
 │  redirect to /sign-in  │                              │                             │
 │    ?returnTo=...       │                              │                             │
 │                        │                              │                             │
 │  (after login, back    │                              │                             │
 │   to confirm page)     │                              │                             │
 │                        │                              │                             │
 │<───────────────────────┤                              │                             │
 │  (show words + Approve)│                              │                             │
 │                        │                              │                             │
 │ POST /auth/cli/        │                              │                             │
 │   confirm/:requestId   │                              │                             │
 ├───────────────────────>│  confirmCliLoginRequest()    │                             │
 │                        ├─────────────────────────────>│  generate code              │
 │                        │                              │  UPDATE set code, userId    │
 │                        │                              ├────────────────────────────>│
 │  redirect to           │                              │                             │
 │  localhost?code=xxx ──>│                              │                             │
 │                        │                              │                             │
CLI                       │                              │                             │
 │ POST /api/auth/cli/    │                              │                             │
 │   exchange             │                              │                             │
 │  {state, requestId,    │                              │                             │
 │   code, tokenName}     │                              │                             │
 ├───────────────────────>│  exchangeCliLoginCode()      │                             │
 │                        ├─────────────────────────────>│  SELECT WHERE state         │
 │                        │                              │    AND id AND code match    │
 │                        │                              │    AND not expired          │
 │                        │                              │    AND NOT consumed_at      │
 │                        │                              │  Verify IP matches          │
 │                        │                              │  UPDATE consumed_at = now   │
 │                        │                              ├────────────────────────────>│
 │                        │                              │                             │
 │                        │  generateUserApiToken()      │                             │
 │                        │  INSERT user_api_tokens      │                             │
 │                        │                              ├────────────────────────────>│
 │<───────────────────────┤                              │                             │
 │  {token, tokenHint,    │                              │                             │
 │   tokenName}           │                              │                             │
```

## returnTo Redirect Flow

Currently, auth redirects always go to `/` after login. The CLI confirm page needs to redirect back to `/auth/cli/confirm/:requestId` after login. This requires threading `returnTo` through all auth flows.

### Open Redirect Prevention

- `returnTo` must be a relative path starting with `/`
- Must NOT start with `//` (protocol-relative URL)
- Must NOT contain `\` (backslash normalization attack)
- Validate with a shared utility: `src/lib/validate-return-to.ts`

### returnTo Data Flow

```
1. /auth/cli/confirm/:requestId (not logged in)
   → redirect to /sign-in?returnTo=/auth/cli/confirm/:requestId

2a. Email OTP flow:
    /sign-in?returnTo=... → SignInForm reads returnTo from searchParams
    → verifyOTPForSigningInAction(email, otpId, code, returnTo)
    → server action returns { returnTo } on success
    → client redirects to returnTo (or "/" if absent)

2b. Google OAuth flow:
    /sign-in?returnTo=... → initiateGoogleOAuthAction("sign-in", returnTo)
    → server action encodes returnTo into OAuth state
    → Google callback route extracts returnTo from state
    → redirects to returnTo (or "/" if absent)
```

## API Endpoints

### `POST /api/auth/cli/requests` (no auth)

- Body: `{ state: string, callbackUrl: string }`
- Validates `callbackUrl` starts with `http://localhost:` or `http://127.0.0.1:`
- Validates `state` is non-empty string
- Stores requester's IP address (from `x-real-ip` header or request, via `getRequestMetadata()`)
- Returns: `{ requestId: string, words: string }`

### `GET /auth/cli/confirm/[requestId]` (requires login)

- Server component page showing verification words + Approve button
- If not logged in, redirects to `/sign-in?returnTo=/auth/cli/confirm/{requestId}`
- If request expired or not found, shows error

### `POST /api/auth/cli/confirm/[requestId]` (requires login)

- Confirms the request, generates authorization code
- Sets `code`, `codeExpiresAt` (60s), `userId` on the request
- Returns redirect URL: `{callbackUrl}?code={code}`

### `POST /api/auth/cli/exchange` (no auth)

- Body: `{ state: string, requestId: string, code: string, tokenName: string }`
- Verifies state match + code + not expired + not consumed (`consumedAt IS NULL`)
- Verifies requester's IP matches the IP stored when the request was created — returns 403 if mismatch
- Marks the login request as consumed (`consumedAt = now`)
- Creates user API token, returns: `{ token: string, tokenHint: string, tokenName: string }`

### `GET /auth/cli/complete`

- Static page: "Login successful! You can close this tab."
- Error state when `?error=...` search param present

## Tasks

### Task 1: returnTo redirect support

Add `returnTo` query param support to the existing sign-in flow. This is a prerequisite for the CLI confirm page which needs to redirect unauthenticated users to sign-in and back.

#### 1a. returnTo validation utility

- [x] `src/lib/validate-return-to.ts` — export `validateReturnTo(returnTo: string | null): string | null`
  - Returns `null` if input is null/empty
  - Returns `null` if value doesn't start with `/`
  - Returns `null` if value starts with `//` (protocol-relative URL)
  - Returns `null` if value contains `\` (backslash normalization)
  - Returns the sanitized path string otherwise

#### 1b. Sign-in page returnTo support

- [x] `src/app/(auth)/sign-in/page.tsx` — accept `searchParams`, pass `returnTo` to `SignInForm`
  - `SignInPage` receives `searchParams` prop (Next.js page convention), extracts `returnTo`
  - Pass `returnTo` as prop to `<SignInForm returnTo={returnTo} />`
- [x] `src/app/(auth)/sign-in/sign-in-form.tsx` — accept `returnTo` prop
  - Add `returnTo?: string` to component props
  - In `handleVerifyOTP`: after successful verification, `router.push(returnTo || '/')` instead of hardcoded `'/'`
  - In `handleGoogleSignIn`: pass `returnTo` to `initiateGoogleOAuthAction('sign-in', returnTo)`
  - Pass `returnTo` to sign-up link: `<Link href={returnTo ? \`/sign-up?returnTo=${encodeURIComponent(returnTo)}\` : '/sign-up'}>`

#### 1c. Sign-up page returnTo support

- [x] `src/app/(auth)/sign-up/page.tsx` — accept `searchParams`, pass `returnTo` to `SignUpForm`
- [x] `src/app/(auth)/sign-up/sign-up-form.tsx` — same pattern as sign-in form
  - In `handleVerifyOTP`: `router.push(returnTo || '/')` instead of `'/'`
  - In `handleGoogleSignUp`: pass `returnTo` to `initiateGoogleOAuthAction('sign-up', returnTo)`
  - Pass `returnTo` to sign-in link

#### 1d. Google OAuth returnTo threading

- [x] `src/app/(auth)/actions.ts` — update `initiateGoogleOAuthAction` signature to accept optional `returnTo`
  - `initiateGoogleOAuthAction(intent, returnTo?)` — sets `oauth_return_to` cookie (httpOnly, secure, sameSite=lax, 10min TTL) since Kenmon's authenticator doesn't support extra state data in the JWT
- [x] `src/app/api/auth/google/callback/route.ts` — read `oauth_return_to` cookie, validate with `validateReturnTo()`, redirect to `returnTo || '/'`, delete cookie

#### 1e. Auth layout returnTo preservation

- [x] Auth redirect with returnTo preservation — moved from layout to individual pages (`sign-in/page.tsx`, `sign-up/page.tsx`) since Next.js layouts don't receive `searchParams`. Each page checks `getAuthUser()` and redirects to `validatedReturnTo || '/'`. Layout stripped of auth redirect to avoid conflicting with page-level handling.

### Task 2: User API tokens schema + service

#### 2a. Database schema

- [x] `src/server/db/schema/user-api-tokens.ts` — new table definition
  - Schema fields as defined in Data Model section above
  - Add `relations`: `one` relation to `users` table
  - Pattern: follow `src/server/db/schema/project-worker-api-tokens.ts` exactly
- [x] `src/server/db/schema/index.ts` — add `export * from './user-api-tokens'`

#### 2b. Service layer

- [x] `src/server/services/user-api-token.ts` — CRUD + validation
  - Follow pattern from `src/server/services/project-worker-api-token.ts`
  - `USER_TOKEN_PREFIX = 'naholo_user_'`
  - `generateUserToken(): string` — `USER_TOKEN_PREFIX + randomBytes(20).toString('hex')`
  - `hashToken(token: string): string` — SHA-256 hex (same as worker token)
  - `createUserApiToken(userId: string, data: { name: string }): Promise<SuccessResult<{ id: string; token: string; tokenHint: string }>>` — generate token, hash, insert, return plaintext token
  - `resolveUserByApiToken(token: string): Promise<{ userId: string; tokenId: string } | null>` — lookup by hash, return userId
  - `touchUserApiToken(tokenId: string): Promise<void>` — update `lastUsedAt`
  - `listUserApiTokens(userId: string): Promise<ApiToken[]>` — list tokens for a user
  - `revokeUserApiToken(userId: string, tokenId: string): Promise<ReturnResult<undefined>>` — delete token scoped to user

#### 2c. Auth middleware update

- [x] `src/server/auth/utils.ts` — update `requireProjectWorker` to accept user API tokens
  - Current flow checks `Bearer naholo_` prefix → resolves to project worker via token
  - Add new branch: if token starts with `naholo_user_`, call `resolveUserByApiToken(token)` to get `userId`, then resolve project worker
  - Token dispatch order: `naholo_user_` prefix → user token path; `naholo_` prefix → worker token path (existing)
  - Fire-and-forget `touchUserApiToken(tokenId)` same as worker tokens
  - **Project worker override via `x-naholo-project-worker` header** (only for user tokens):
    - If `x-naholo-project-worker` header is set: look up the project worker by id, verify it belongs to the project AND has `type = 'bot'` (users can only override to bot workers, not other humans' workers). Return 403 if not found, wrong project, or not a bot.
    - If `x-naholo-project-worker` header is missing: fall back to `resolveProjectWorkerByUserIdAndProjectId(userId, projectId)` to use the user's own project worker
  - This header is ignored for worker API tokens (`naholo_` prefix) — those already resolve to a specific worker

### Task 3: CLI login request schema + service

#### 3a. Database schema

- [x] `src/server/db/schema/cli-login-requests.ts` — table definition as specified in Data Model
  - Add relation: `one` relation to `users` table for `userId`
- [x] `src/server/db/schema/index.ts` — add `export * from './cli-login-requests'`

#### 3b. Word generation utility

- [x] `src/lib/auth/cli-words.ts`
  - Hardcoded ~256 simple English words (mix of adjectives and nouns)
  - `generateReadableWords(): string` — pick 3 random words via `crypto.randomInt`, join with `-`

#### 3c. Service layer

- [x] `src/server/services/cli-login-request.ts`
  - `createCliLoginRequest(state, callbackUrl, ipAddress)` — generate words, insert with `expiresAt = now + 10 minutes`
  - `getCliLoginRequestById(requestId)` — find by id, no filtering (returns full row or null)
  - `isCliLoginRequestPending(request)` — checks not expired + no code issued yet
  - `isCliLoginRequestConsumable(request)` — checks code issued, code not expired, not consumed
  - `issueCliLoginRequestCode(requestId, userId)` — pure mutation: generate code, set `codeExpiresAt = now + 60s`, `userId`
  - `markCliLoginRequestConsumed(requestId)` — pure mutation: set `consumedAt = now`
  - Verification logic (expiry, state match, IP match, consumed check) is handled by callers (routes), not the service

### Task 4: CLI auth API routes + pages

#### 4a. Create request endpoint

- [x] `src/app/api/auth/cli/requests/route.ts` — `POST`
  - No auth required
  - Zod validate body: `{ state: string, callbackUrl: string }`
  - Extract IP via `getRequestMetadata()` from `src/server/auth/utils.ts`
  - Call `createCliLoginRequest(state, callbackUrl, ipAddress)`
  - Return JSON `{ requestId, words }` with status 201

#### 4b. Confirm page

- [x] `src/app/auth/cli/confirm/[requestId]/page.tsx` — server component
  - Call `getAuthUser()` — if null, `redirect('/sign-in?returnTo=/auth/cli/confirm/' + requestId)`
  - Call `getCliLoginRequestById(requestId)` — if null/expired, show error message
  - Render: verification words prominently, "A CLI app is requesting access to your account", Approve button
  - Approve button submits to the confirm API route

#### 4c. Confirm API endpoint

- [x] `src/app/api/auth/cli/confirm/[requestId]/route.ts` — `POST`
  - Requires session auth (call `getAuthUser()`, return 401 if null)
  - Call `confirmCliLoginRequest(requestId, userId)`
  - Return JSON `{ redirectUrl: callbackUrl + '?code=' + code }`
  - Client-side JS handles the redirect (since localhost callback needs to be opened from the browser)

#### 4d. Exchange endpoint

- [x] `src/app/api/auth/cli/exchange/route.ts` — `POST`
  - No auth required
  - Zod validate body: `{ state: string, requestId: string, code: string, tokenName: string }`
  - Extract IP via `getRequestMetadata()`
  - Call `exchangeCliLoginCode(state, requestId, code, ipAddress)` — return 401 if null (covers both invalid code and IP mismatch)
  - Call `createUserApiToken(userId, { name: tokenName })` (from Task 2b)
  - Return JSON `{ token, tokenHint, tokenName }`

#### 4e. Complete page

- [x] `src/app/auth/cli/complete/page.tsx` — static page
  - Default: "Login successful! You can close this tab."
  - If `?error=...` searchParam: show error message

### Task 5: CLI login command

- [x] `packages/naholo-cli/src/commands/login.ts` — full login flow
  - Accept `--base-url <url>` flag (default: prompt for server URL)
  - Prompt for token name (default: `os.userInfo().username + '@' + os.hostname()`, accept with Enter)
  - Generate crypto-safe random `state` via `crypto.randomBytes(32).toString('hex')`
  - `POST /api/auth/cli/requests` with `{ state, callbackUrl: 'http://localhost:PORT/callback' }`
  - Start temporary localhost HTTP server on port 0 (OS picks free port)
  - Display verification words, prompt "Press Enter to open browser"
  - Open browser to `{baseUrl}/auth/cli/confirm/{requestId}` (use `open` npm package)
  - Wait for callback with `code` query param (5 minute timeout)
  - On receiving callback: redirect browser to `{baseUrl}/auth/cli/complete` (or `?error=...` on failure), shut down server
  - `POST /api/auth/cli/exchange` with `{ state, requestId, code, tokenName }`
  - Create profile file at `~/.naholo/profiles/{baseUrlHost}.yml`
  - Update `config.yml` to set as default profile
  - Print success message
- [x] `packages/naholo-cli/src/config.ts` — read/write `~/.naholo/config.yml`
- [x] `packages/naholo-cli/src/profile.ts` — read/write/list profiles under `~/.naholo/profiles/`

### Task 6: CLI logout + whoami

- [x] `packages/naholo-cli/src/commands/logout.ts`
  - Read default profile (or `--profile` override)
  - Delete profile file, update `config.yml`
  - Print "Logged out of {profileName}"
- [x] `packages/naholo-cli/src/commands/whoami.ts`
  - Read default profile, call `GET /api/auth/me` (needs new endpoint or reuse existing)
  - Print: profile name, server URL, user info
  - If token invalid (401/403), suggest `naholo login`

## Notes

- User API tokens use `naholo_user_` prefix to distinguish from worker tokens (`naholo_`)
- `--profile` global flag allows using non-default profiles
- Token stored in plaintext in profile (same as `gh`, `gcloud`)
- The `tokenName` is stored in the `user_api_tokens.name` column (e.g., "alice@macbook") — it is also saved to the profile yml for display purposes
- Profile yml does NOT store a `name` field — the profile is identified by filename
- The Kenmon `KenmonGoogleOAuthAuthenticator` stores intent in OAuth state — need to verify how to thread `returnTo` through it. May need to encode it alongside intent or extend the authenticator.
- `requireAuthOrRedirect()` in `src/server/auth/utils.ts` currently redirects to `/sign-in` without `returnTo` — updating it is out of scope since the CLI confirm page handles its own redirect. But could be updated later for general use.
