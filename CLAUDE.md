# Naholo

Task/issue management web app for documenting work, managing hierarchical tasks, and keeping logs.

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
│ │ └── projects/[projectId]/issues/[issueId]/
│ └── api/ # REST API (mirrors app routes)
├── components/
│ ├── tasks/ # Task list, item, note, actions, context
│ ├── issues/ # Issue page components
│ ├── logs/ # Log list and editor
│ ├── notes/ # Note tabs (per-issue documentation)
│ └── ui/ # Shared UI primitives (Radix-based)
├── hooks/ # React Query hooks (use-tasks, use-issues, etc.)
├── lib/ # Utilities (fetcher, utils, date-utils)
└── server/
├── db/schema/ # Drizzle table definitions
└── services/ # Business logic (task, issue, note, log)

## Key Conventions

- Single quotes, no semicolons (Prettier)
- Path alias: `@/*` → `./src/*`
- Handlers: `handle[Action]` (e.g., `handleSave`, `handleRowKeyDown`)
- Hooks: `use-[entity].ts` with React Query + optimistic updates
- Services: `src/server/services/[entity].ts` with raw SQL via Drizzle
- Components: one component per file, co-located context providers
- Result type: `Ok<T>` / `Err<E>` pattern in `lib/return-result.ts`

## Build & Test

- `npm run dev` — dev server
- `npm run build` — production build (do NOT run for verification)
- `npx tsc` — type check (use this for verification)
- Pre-commit: `npx pretty-quick --staged`
- **Do NOT run `db:generate` or `db:migrate`** — leave DB migrations to the user

## Domain Model

- **Project** → has many **Issues**
- **Issue** → has many **Tasks** (hierarchical via `parentTaskId`), **Notes** (tabbed docs), **Logs** (activity)
- **Task** → `name` (single-line), `note` (markdown), `done`, `position`, self-referencing `parentTaskId`

## Architecture Patterns

- Task list renders as flat array with depth, not recursive components
- Task keyboard nav: depth-first traversal with DOM queries for visibility
- Animated expand/collapse: CSS grid-rows transition (`grid-rows-[0fr]` ↔ `grid-rows-[1fr]`)
- Focus management: centralized in task-context.tsx (`focusedTaskId`, `isListFocused`)

## Plans

See `docs/plans/` for implementation plans.
