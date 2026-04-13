# P30: App Documentation

## Goal

Create documentation that gives AI agents (and humans) a clear picture of what Naholo is, what it can do today, and how the expected AI-assisted development workflow operates. These docs live in the repo and are referenced by agents working on or with Naholo.

## Prerequisites

None — this is a documentation-only plan.

## Architecture Decisions

- Docs go in `docs/` at the repo root (not `docs/plans/`, which is for implementation plans)
- Three documents, each serving a distinct audience/purpose:
  1. **`docs/app-overview.md`** — What Naholo is and what features it has today. Written for an agent that needs to understand the product.
  2. **`docs/ai-workflow.md`** — The expected AI-assisted development workflow: how a user and AI agents interact with Naholo to go from idea to shipped code.
  3. **`docs/cli-and-mcp.md`** — Reference for the CLI commands and MCP tools/resources. Written for an agent that needs to interact with Naholo programmatically.
- Keep docs concise and scannable — agents consume tokens, so avoid fluff
- Use Markdown with headers, tables, and short paragraphs
- Do NOT duplicate CLAUDE.md content (tech stack, conventions, build commands) — these docs describe the product, not the codebase

## Tasks

### Task 1: App overview doc

- [x] Create `docs/app-overview.md` covering:
  - **What Naholo is**: Task/issue management app for documenting work, managing hierarchical tasks, and keeping logs. Messenger-style interface for logging progress.
  - **Domain model** (concise): Project → Issues → Tasks (hierarchical, checkbox-based) + Logs (chronological markdown journal, messenger-style) + Notes (tabbed reference documents, markdown)
  - **Projects**: User-owned, slug-based identifier, has workers (human or bot participants with roles `admin`/`member`)
  - **Issues**: Sequential per-project numbering (`#1`, `#2`, ...). Can be open/closed. Each issue is a workspace combining tasks, logs, and notes.
  - **Tasks**: Single-line name + optional markdown note. Hierarchical via `parentTaskId` (multi-level nesting). Ordered by position. Has `done` boolean. Keyboard-driven outliner UI.
  - **Logs**: Append-only markdown messages. Messenger-style display (own messages right-aligned, others left-aligned). Bot workers can post logs via API. Last log preview cached on the issue for list display.
  - **Notes**: Titled markdown documents attached to an issue. Tabbed UI with autosave. Used for reference/specs/documentation per issue.
  - **Workers**: Project members. Type `user` (linked to account) or `bot` (API-only). Each worker can have scoped API tokens (`naholo_` prefix). Bot workers appear as separate authors in logs.
  - **Skills**: Reusable Claude Code instruction files managed in the web UI. Organized into Skill Sets (name + slug). Each skill has content (markdown) and full revision history. Can be installed locally via CLI as `.claude/skills/{name}/SKILL.md`.
  - **Auth**: Google OAuth + Email OTP for web. CLI uses device flow (word-pair verification). User API tokens (`naholo_user_` prefix) for personal CLI/API access. Worker API tokens for project-scoped bot access.

### Task 2: AI workflow doc

- [x] Create `docs/ai-workflow.md` covering:
  - **Overview**: Naholo is designed as a harness for AI-assisted development. The workflow connects idea capture (in the web app) to plan execution (in local repos with AI agents).
  - **Phase 1 — Capture ideas**: User creates an issue in Naholo. Drops thoughts, requirements, and context as logs (quick messages) and notes (structured reference docs). This is the brainstorming/collection phase.
  - **Phase 2 — Plan**: User picks an issue to work on. An AI agent reads the issue context (tasks, logs, notes) via MCP resources and processes it into an actionable plan. The plan is written as one or more markdown files in the local repo (e.g., `docs/plans/pN-feature.md`). The plan contains numbered tasks with subtasks, file paths, and implementation details.
  - **Phase 3 — Execute**: AI and human collaborate on the plan. The agent implements tasks from the plan document, checking them off as completed. Specs may change — the plan doc is updated accordingly. Progress is tracked both locally (in the markdown) and remotely (tasks in Naholo via MCP).
  - **Phase 4 — Wrap up**: When the issue is completed, paused, or aborted:
    - Agent summarizes what was done and posts it as a log entry
    - Local markdown plan files are registered as issue notes (so the work is preserved in Naholo)
    - Task progress is synced to the issue's tasks in Naholo
    - Issue is closed (if completed)
  - **Key integration points**: Explain how each tool enables this:
    - **MCP Resources** (`naholo://issues/{n}`) — agent reads issue context to understand what to work on
    - **MCP Tools** (`create_task`, `update_task`, `create_log`, `close_issue`) — agent writes progress back
    - **CLI** (`naholo skills install`) — installs shared skills/instructions for consistent agent behavior across repos
    - **Skills** — team-shared Claude Code instructions managed centrally in the web UI
  - **Note**: This workflow is the vision. Not all phases are fully automated yet — some steps (like plan-to-note sync, task sync on wrap-up) are manual or planned for future implementation.

### Task 3: CLI and MCP reference doc

- [x] Create `docs/cli-and-mcp.md` covering:
  - **Setup**:
    - `naholo login` — opens browser for device-flow auth, saves profile to `~/.naholo/profiles/{name}.yml`
    - `naholo init` — interactively selects project + worker, writes `.naholo/config.yml`, `.naholo/local/local-config.yml`, and `.mcp.json`
  - **CLI Commands** (table format):
    - `naholo login` — authenticate via browser
    - `naholo logout` — remove active profile
    - `naholo init` — initialize project in current directory
    - `naholo status` — show current project/worker
    - `naholo whoami` — show logged-in user
    - `naholo mcp` — start MCP server (stdio transport)
    - `naholo skills install` — interactively install skill set as `.claude/skills/{name}/SKILL.md` files
    - `naholo skills upsert <skillSetSlug> <skillName> <filePath>` — upload local file as a skill
    - `naholo skills sets create --name <n> --slug <s>` — create skill set
    - `naholo skills sets update <slug> [--name] [--slug]` — update skill set
    - `naholo skills sets delete <slug>` — delete skill set
  - **Config files**:
    - `~/.naholo/config.yml` — `defaultProfile` pointer
    - `~/.naholo/profiles/{name}.yml` — `baseUrl` + user token
    - `.naholo/config.yml` (committed) — `projectId`, `defaultWorkerId`
    - `.naholo/local/local-config.yml` (git-ignored) — `projectWorkerId` for this machine
    - `.mcp.json` — MCP server config (auto-generated by `naholo init`)
  - **MCP Tools** (table: name, input schema, description):
    - `create_issue` — `{ title: string }` — create a new issue
    - `close_issue` — `{ issueNumber: number }` — close an issue
    - `create_task` — `{ issueNumber, name, note?, parentTaskId?, position? }` — create a task
    - `update_task` — `{ issueNumber, taskId, name?, note?, done? }` — update a task
    - `create_log` — `{ issueNumber, content }` — create a log entry
  - **MCP Resources** (table: URI pattern, description):
    - `naholo://project` — current project details (JSON)
    - `naholo://issues` — open issues list (JSON)
    - `naholo://issues/{issueNumber}` — full issue context (issue + tasks + notes + logs)
    - `naholo://issues/{issueNumber}/tasks` — tasks for an issue
    - `naholo://issues/{issueNumber}/notes` — notes for an issue

## Notes

- These docs describe the product, not the codebase. Codebase conventions stay in CLAUDE.md.
- The AI workflow doc (Task 2) describes the vision. Some steps are manual today — the doc should be honest about what's automated vs. aspirational.
- Keep all three docs under ~200 lines each. Agents pay per token — brevity matters.
- If the CLI commands or MCP tools change, these docs need updating. Consider adding a reminder in the relevant plan docs.
