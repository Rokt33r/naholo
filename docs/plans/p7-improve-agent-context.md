# P7: Improve Agent Context

## Problem

Every Claude Code session starts fresh. When working on P6, the agent spent ~68K tokens and 40 tool calls just exploring the codebase before it could write a plan. This happens every session because:

- No `CLAUDE.md` exists — the agent has zero upfront context about the project
- No `.claude/rules/` — no file-type-specific conventions
- Plan docs in `docs/plans/` aren't linked to any context system

## Goal

Make Claude Code productive from the first message of any session by providing project context upfront via `CLAUDE.md` and `.claude/rules/`. All context lives in the project folder, version-controlled with git.

## Changes

### 1. Create root `CLAUDE.md`

**File:** `CLAUDE.md` (project root, committed to git)

Keep under 200 lines. Include:

```markdown
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
- `npm run build` — production build
- `npx tsc` — type check
- Pre-commit: `npx pretty-quick --staged`

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
```

### 2. Create `.claude/rules/` for scoped conventions

**File:** `.claude/rules/components.md`

```markdown
---
paths:
  - 'src/components/**/*.tsx'
---

# Component Conventions

- One component per file, named export matching filename
- Use `cn()` from `@/lib/utils` for conditional classNames
- Keyboard event handlers: `handle[Element]KeyDown` (e.g., `handleRowKeyDown`)
- Focus management via refs + `requestAnimationFrame` after DOM changes
- Animations: CSS grid-rows transition, not JS-based
- Never use recursive component rendering for tree structures — flatten with depth
```

**File:** `.claude/rules/hooks.md`

```markdown
---
paths:
  - 'src/hooks/**/*.ts'
---

# Hook Conventions

- React Query for all server state
- Every mutation uses optimistic updates with rollback on error
- Stale time: 1 minute
- Temp IDs prefixed with `temp-` for optimistic creates
- Export named types alongside hooks (e.g., `export type Task = { ... }`)
```

**File:** `.claude/rules/api.md`

```markdown
---
paths:
  - 'src/app/api/**/*.ts'
---

# API Route Conventions

- Validate request body with Zod
- Auth check via `getSessionFromRequest()`
- Return JSON with appropriate status codes
- Follow REST conventions: GET (list/read), POST (create), PATCH (update), DELETE
```

**File:** `.claude/rules/services.md`

```markdown
---
paths:
  - 'src/server/services/**/*.ts'
---

# Service Conventions

- Pure business logic, no HTTP concerns
- Accept `userId` as first param for auth scoping
- Use Drizzle query builder, not raw SQL
- Position management: atomic SQL increment/decrement
- Return plain objects, not Drizzle row types
```

## Files to Create

| File                          | Scope                    | Purpose                                  |
| ----------------------------- | ------------------------ | ---------------------------------------- |
| `CLAUDE.md`                   | Project root             | Primary project context (shared via git) |
| `.claude/rules/components.md` | `src/components/**`      | Component conventions                    |
| `.claude/rules/hooks.md`      | `src/hooks/**`           | Hook conventions                         |
| `.claude/rules/api.md`        | `src/app/api/**`         | API route conventions                    |
| `.claude/rules/services.md`   | `src/server/services/**` | Service layer conventions                |

## Expected Impact

- Agent starts with full project context instead of spending 40+ tool calls exploring
- File-scoped rules load only when relevant, saving context window
- All context is version-controlled and shared across machines/contributors
- New contributors (human or AI) onboard faster via `CLAUDE.md`

## Maintenance

- Update `CLAUDE.md` when architecture changes (new entities, patterns, key files)
- Rules files evolve as conventions solidify
