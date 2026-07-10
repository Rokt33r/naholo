# Naholo

Operation/task management web app for documenting work, managing tasks, and keeping comms logs.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Tailwind CSS 4 + Radix UI
- Drizzle ORM + PostgreSQL
- TanStack React Query 5 (optimistic updates)
- Kenmon (auth with Google OAuth + Email OTP)

## Project Structure

src/
├── app/ # Next.js routes + API handlers
│ ├── app/ # Authenticated app routes
│ │ └── projects/[projectSlug]/operations/[operationNumber]/
│ └── api/ # REST API (mirrors app routes)
├── components/
│ ├── tasks/ # Task list, item, note, actions, context
│ ├── operations/ # Operation page components
│ ├── operation-logs/ # Comms log list and editor
│ ├── notes/ # Note tabs (per-operation documentation)
│ └── ui/ # Shared UI primitives (Radix-based)
├── hooks/ # React Query hooks (use-tasks, use-operations, etc.)
├── lib/ # Utilities (fetcher, utils, date-utils)
└── server/
├── db/schema/ # Drizzle table definitions
└── services/ # Business logic (task, operation, note, operation-log)

## Key Conventions

- Single quotes, no semicolons (Prettier)
- Path alias: `@/*` → `./src/*`
- Handlers: `handle[Action]` (e.g., `handleSave`, `handleRowKeyDown`)
- Hooks: `use-[entity].ts` with React Query + optimistic updates
- Services: `src/server/services/[entity].ts` with raw SQL via Drizzle
- Components: one component per file, co-located context providers
- Result type: `Ok<T>` / `Err<E>` pattern in `lib/return-result.ts`

## Rules

Additional project rules live in [.claude/rules/](./.claude/rules/) and are loaded automatically:

- [style.md](./.claude/rules/style.md) — code-style conventions
- [env-vars.md](./.claude/rules/env-vars.md) — env var add/remove checklist (Dockerfile / deploy.yml / Terraform / `.env.example`)
- [skill-edits.md](./.claude/rules/skill-edits.md) — routing rule for editing core skills (`/infil`, `/warno`, `/opord`, `/splash`, `/sitrep`, `/exfil`)

## Design references

When the user provides a Claude design link (`claude.ai/design/p/<projectId>...`), read the design with the `DesignSync` tool — `list_files` then `get_file` against the `projectId` from the URL — never `WebFetch`/`curl` (both 403 on these). The `?file=` query names the specific `.dc.html` to read.

## Build & Test

- `pnpm run dev` — dev server
- `pnpm run build` — production build (do NOT run for verification)
- **Do NOT run `db:generate` or `db:migrate`** — leave DB migrations to the user

## Post-edit scripts

Run these after editing. No permission prompt needed for any of them.

- **Run each verification script bare** — invoke `pnpm format` / `pnpm typecheck` (etc.) on their own. Do NOT wrap them in `echo`, pipe to `tail`/`head`/`grep`, chain with `&&`, or add any redirection — just run the command and read its full output.
- **Always** — `pnpm format`, on any edit to any tracked file.
- **Typecheck** — pick the script for the workspace you edited. The root `typecheck` only covers the Next.js app (`src/`); editing under `packages/*` without running the matching filtered script will silently miss errors.
  - Edits under `src/` (Next.js app) → `pnpm typecheck`
  - Edits under `packages/naholo-cli/` → `pnpm --filter @naholo/cli typecheck`
  - Edits under `packages/naholo-api/` → `pnpm --filter naholo-api typecheck`
  - Edits under `packages/naholo-agent-transcripts/` → `pnpm --filter naholo-agent-transcripts typecheck`
  - Edits spanning multiple workspaces → run the script for each touched workspace.

## Domain Model

- **Project** → has many **Operations**
- **Operation** → has many **Tasks** (flat list — no parent/child nesting in the agent workflow), **Notes** (tabbed docs), **Operation Logs** (comms)
- **Task** → `name` (single-line), `note` (markdown), `done`, `position`, self-referencing `parentTaskId` (supported by the schema but unused by the skill set)
- **Project** → has many **Operators** (users with access)
- **Project** → has many **Skill Loadouts** → each has many **Skills**

## Architecture Patterns

- Task list renders as flat array with depth, not recursive components
- Task keyboard nav: depth-first traversal with DOM queries for visibility
- Animated expand/collapse: CSS grid-rows transition (`grid-rows-[0fr]` ↔ `grid-rows-[1fr]`)
- Focus management: centralized in task-context.tsx (`focusedTaskId`, `isListFocused`)
