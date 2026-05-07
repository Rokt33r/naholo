# Naholo

Operation/objective management web app for documenting work, managing hierarchical objectives, and keeping comms logs.

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
│ ├── objectives/ # Objective list, item, note, actions, context
│ ├── operations/ # Operation page components
│ ├── operation-logs/ # Comms log list and editor
│ ├── notes/ # Note tabs (per-operation documentation)
│ └── ui/ # Shared UI primitives (Radix-based)
├── hooks/ # React Query hooks (use-objectives, use-operations, etc.)
├── lib/ # Utilities (fetcher, utils, date-utils)
└── server/
├── db/schema/ # Drizzle table definitions
└── services/ # Business logic (objective, operation, note, operation-log)

## Key Conventions

- Single quotes, no semicolons (Prettier)
- Path alias: `@/*` → `./src/*`
- Handlers: `handle[Action]` (e.g., `handleSave`, `handleRowKeyDown`)
- Hooks: `use-[entity].ts` with React Query + optimistic updates
- Services: `src/server/services/[entity].ts` with raw SQL via Drizzle
- Components: one component per file, co-located context providers
- Result type: `Ok<T>` / `Err<E>` pattern in `lib/return-result.ts`

## Build & Test

- `pnpm run dev` — dev server
- `pnpm run build` — production build (do NOT run for verification)
- `npx tsc` — type check (use this for verification)
- `pnpm format` - format code with prettier, run this after editing is done.
- **Do NOT run `db:generate` or `db:migrate`** — leave DB migrations to the user

## Domain Model

- **Project** → has many **Operations**
- **Operation** → has many **Objectives** (hierarchical via `parentObjectiveId`), **Notes** (tabbed docs), **Operation Logs** (comms)
- **Objective** → `name` (single-line), `note` (markdown), `done`, `position`, self-referencing `parentObjectiveId`
- **Project** → has many **Operators** (users/bots with access)
- **Project** → has many **Skill Loadouts** → each has many **Skills**

## Architecture Patterns

- Objective list renders as flat array with depth, not recursive components
- Objective keyboard nav: depth-first traversal with DOM queries for visibility
- Animated expand/collapse: CSS grid-rows transition (`grid-rows-[0fr]` ↔ `grid-rows-[1fr]`)
- Focus management: centralized in objective-context.tsx (`focusedObjectiveId`, `isListFocused`)

## Terminology

Old → New mapping (for agents encountering legacy references):

| Old Term         | New Term      | Notes                                        |
| ---------------- | ------------- | -------------------------------------------- |
| issue            | operation     | DB table, types, routes, components          |
| task             | objective     | DB table, types, routes, components          |
| worker           | operator      | DB table, types, routes, components          |
| skill set        | skill loadout | Container for skills                         |
| skill            | skill         | **Unchanged**                                |
| Logs (tab label) | Comms         | UI label only; code entity is `operationLog` |
| notes            | notes         | **Unchanged**                                |
