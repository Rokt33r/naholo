# P26-S4: User API Tokens & CLI Login

## Goal

Introduce user-scoped API tokens (separate from project worker tokens) so the CLI can authenticate as a user across all their projects. Add an OAuth-like login flow for the CLI.

## Motivation

Worker API tokens are per-project and per-worker — requiring a separate token for every cloned repo makes token management impractical. User API tokens are personal and work across all projects the user has access to, similar to how `gh` auth tokens work.

## Architecture Decisions

- **Global config**: `~/.naholo/config.yml` stores `defaultProfile` pointer
- **Profiles**: `~/.naholo/profiles/{name}.yml` stores `baseUrl` and `token` per server
- **OAuth-like login**: CLI opens browser, user approves, CLI receives token via localhost callback (same pattern as gunship CLI from the reference design in px-better-cli-design.md)
- **User API tokens table**: New `user_api_tokens` table, separate from project worker tokens

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
name: { profileName }
baseUrl: https://naholo.example.com
token: naholo_user_...
createdAt: 2026-03-28T00:00:00Z
```

## Data Model

### `user_api_tokens` table

```
id            uuid        PK, default random
user_id       uuid        FK → users.id ON DELETE CASCADE, NOT NULL
name          text        NOT NULL (e.g., "alice@macbook")
token_hash    text        NOT NULL, UNIQUE
token_hint    text        NOT NULL (last 4 chars for display)
created_at    timestamp   NOT NULL, default now()
```

### `cli_login_requests` table

```
id              uuid        PK, default random
state_hash      text        NOT NULL, UNIQUE
words           text        NOT NULL (human-readable verification phrase)
code            text        NULL (set on confirm)
code_expires_at timestamp   NULL (60s after confirm)
user_id         uuid        NULL FK → users.id (set on confirm)
callback_url    text        NOT NULL (must be localhost)
expires_at      timestamp   NOT NULL (10 min from creation)
created_at      timestamp   NOT NULL, default now()
```

## Login Flow

1. `naholo login` → prompt for server URL
2. CLI generates `state`, sends `POST /api/auth/cli/requests` with `{state, callbackUrl}`
3. Server returns `{requestId, words}` (human-readable verification phrase)
4. CLI starts localhost server, displays words, opens browser to `/auth/cli/confirm/{requestId}`
5. User sees same words in browser, clicks Approve
6. Server generates short-lived `code`, redirects to localhost callback
7. CLI exchanges `{state, requestId, code, tokenName}` via `POST /api/auth/cli/exchange` → gets token
8. CLI saves token to profile

## API Endpoints

### `POST /api/auth/cli/requests` (no auth)

- Body: `{ state, callbackUrl }`
- Validates callbackUrl is localhost
- Returns: `{ requestId, words }`

### `GET /auth/cli/confirm/:requestId` (requires login)

- Page showing verification words + Approve button
- If not logged in, redirects to login with returnTo

### `POST /auth/cli/confirm/:requestId` (requires login)

- Confirms the request, generates code, redirects to callbackUrl

### `POST /api/auth/cli/exchange` (no auth)

- Body: `{ state, requestId, code, tokenName }`
- Returns: `{ token, tokenHint }`

### `GET /auth/cli/complete`

- Static page: "Login successful! You can close this tab."

## Tasks

### Task 1: User API tokens schema + service

- [ ] `src/server/db/schema/user-api-tokens.ts` — table definition
- [ ] `src/server/services/user-api-token.ts` — `generateUserApiToken`, `validateUserApiToken`, `revokeUserApiToken`
- [ ] Update auth middleware to accept user API tokens (alongside worker tokens)

### Task 2: CLI login request schema + service

- [ ] `src/server/db/schema/cli-login-requests.ts` — table definition
- [ ] `src/lib/auth/cli-words.ts` — word list + `generateReadableWords()`
- [ ] `src/server/services/cli-login-request.ts` — `createCliLoginRequest`, `getCliLoginRequestById`, `confirmCliLoginRequest`, `exchangeCliLoginCode`

### Task 3: CLI auth API routes + pages

- [ ] `src/app/api/auth/cli/requests/route.ts` — POST create request
- [ ] `src/app/auth/cli/confirm/[requestId]/page.tsx` — confirmation page
- [ ] `src/app/api/auth/cli/exchange/route.ts` — POST exchange code for token
- [ ] `src/app/auth/cli/complete/page.tsx` — success page

### Task 4: CLI login command

- [ ] `packages/naholo-cli/src/commands/login.ts` — full login flow
- [ ] `packages/naholo-cli/src/config.ts` — read/write `~/.naholo/config.yml`
- [ ] `packages/naholo-cli/src/profile.ts` — read/write/list profiles

### Task 5: CLI logout + whoami

- [ ] `packages/naholo-cli/src/commands/logout.ts` — delete profile, update config
- [ ] `packages/naholo-cli/src/commands/whoami.ts` — verify token, show user info

## Notes

- User API tokens use `naholo_user_` prefix to distinguish from worker tokens (`naholo_`)
- `--profile` global flag allows using non-default profiles
- Token stored in plaintext in profile (same as `gh`, `gcloud`)
- `returnTo` support needed on login page for the CLI confirm redirect
