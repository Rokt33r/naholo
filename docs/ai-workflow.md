# Naholo — AI-Assisted Development Workflow

Naholo connects idea capture (in the web app) to plan execution (in local repos with AI agents) via five skills: `/infil` → `/spec` → `/ship` → `/sitrep` → `/exfil`.

## Workflow

### Phase 1: Capture Ideas (Web App)

Create an issue in Naholo and collect context:

- **Logs**: Quick thoughts, requirements, questions — dropped as messenger-style messages. Low friction, append-only.
- **Notes**: Structured reference material — specs, API designs, research. Tabbed markdown documents with autosave.

This is the brainstorming phase. The issue accumulates everything needed to start work.

### Phase 2: Infil (`/infil {N}`)

Fetch the issue locally for offline-first work.

- Pulls tasks, notes, and logs from Naholo via MCP
- Creates `.naholo/local/issues/{N}/` with:
  - `TASKS.md` — checkbox task list mirroring server state
  - `notes/PLAN.md` — structured context document with:
    - `## Pain` — what's wrong or missing (≤3 sentences)
    - `## Resolution` — how we plan to fix it (≤3 sentences)
    - `## Open questions` — questions for the user to answer before `/spec`
    - `## Timeline` — chronological log summary, appended to by every subsequent skill
  - `notes/*.md` — any other notes from the issue
- On re-run, performs 3-way merge (local vs server vs baseline) — never silently overwrites local changes

### Phase 3: Spec (`/spec`)

Research the codebase and create an executable specification.

- Creates `notes/SPEC.md` with:
  - **Goal** — what this spec achieves and why
  - **Prerequisites** — what must exist before implementation
  - **Architecture Decisions** — key technical choices with reasoning
  - **Tasks** — numbered tasks in dependency order with subtasks specifying exact file paths and behavior
  - **Notes** — edge cases, gotchas, deferred decisions
- Updates `TASKS.md` to mirror the spec's task structure
- Appends a Timeline entry to PLAN.md
- Quality bar: "Could another session implement this by reading ONLY SPEC.md and CLAUDE.md?"

### Phase 4: Ship (`/ship`)

Implement the spec, task by task.

- Works through unchecked tasks in TASKS.md top-to-bottom
- Reads task details from SPEC.md, implements code changes
- Marks subtasks `[x]` in TASKS.md immediately after completing each one
- Runs formatter and type checker after each top-level task
- Appends progress entries and Timeline entries to PLAN.md
- Updates SPEC.md if implementation deviates (strikethrough on superseded subtasks, never deletes)

### Phase 5: Sync & Close

Two skills for different stages:

**`/sitrep {N}`** — mid-session checkpoint:

- Syncs tasks and notes to server via `sync_tasks` and `create_note`/`update_note`
- Posts a summary log entry
- Appends Timeline entry to PLAN.md
- Leaves local directory intact for continued work

**`/exfil {N}`** — final sync and cleanup:

- Same sync as sitrep
- Posts final summary log
- Appends Timeline entry to PLAN.md
- Optionally closes the issue
- Deletes the local `.naholo/local/issues/{N}/` directory

## Key Files

| File       | Role                                                                   | Owned by                               |
| ---------- | ---------------------------------------------------------------------- | -------------------------------------- |
| `PLAN.md`  | Evolving context: Pain, Resolution, Open Questions, Timeline, Progress | `/infil` creates, all skills append    |
| `SPEC.md`  | Executable specification: Goal, Architecture, Tasks with file paths    | `/spec` creates, `/ship` may update    |
| `TASKS.md` | Progress tracker: checkbox list mirroring spec tasks                   | `/spec` structures, `/ship` checks off |

## MCP Integration

| Tool / Resource                    | Used by                       | Purpose                                 |
| ---------------------------------- | ----------------------------- | --------------------------------------- |
| `naholo://issues/{N}` (resource)   | `/infil`, `/sitrep`, `/exfil` | Read issue context (tasks, notes, logs) |
| `naholo://local/issues` (resource) | `/spec`, `/ship`, `/exfil`    | List locally infiled issues             |
| `sync_tasks`                       | `/sitrep`, `/exfil`           | Bulk sync task tree from TASKS.md       |
| `create_note` / `update_note`      | `/infil`, `/sitrep`, `/exfil` | Create or update issue notes            |
| `create_log`                       | `/sitrep`, `/exfil`           | Post summary log entries                |
| `close_issue`                      | `/exfil`                      | Close a completed issue                 |
