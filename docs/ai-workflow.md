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

Research the codebase and create an executable specification in two phases.

**Phase 1 — Rough plan**: high-level review before diving into detail.

- Researches the codebase, drafts a reviewable-but-not-yet-detailed `notes/SPEC.md` with:
  - **Goal** — what this spec achieves and why
  - **Prerequisites** — what must exist before implementation
  - **Architecture Decisions** — key technical choices with reasoning
  - **Affected files** — list of files to create or modify
  - Optional **Workflow diagrams** / **Wireframes** (ASCII) for non-trivial flows or UI changes
  - **`## TODO - drafting`** — transient checklist (one entry per top-level objective) that gates elaboration. Lives immediately before `## Objectives` and is deleted once every section is filled in.
  - **Objectives** — `### N. Title` headings each with 1–3 sentence descriptions. **No `- N.M.` sub-bullets yet.**
  - **Notes** — edge cases, gotchas, deferred decisions
- Surfaces SPEC.md via a clickable markdown link in chat so the user can review in their editor.
- Asks for approval via `AskUserQuestion` (Approve / Request changes). "Request changes" loops on free-form feedback until the rough plan is approved.

**Phase 2 — Elaboration**: fill in `- N.M.` sub-bullets under each `### N.`. Mode chosen via `AskUserQuestion`:

- **Elaborate all** — fills every section in one batched edit, ticks all TODO boxes, deletes the `## TODO - drafting` section.
- **Elaborate per section** — loops unchecked sections (resume support), drafts sub-bullets per section, asks Approve / Request-changes per section before moving on. Deletes `## TODO - drafting` when the last box ticks.
- **Edit / add context** — escape hatch for free-form edits anywhere in SPEC.md (rough sections, already-elaborated sub-bullets, Notes, anything). Loops on user input until they signal resume, then returns to the elaboration menu.

After full elaboration:

- Mirrors every `- N.M.` sub-bullet from SPEC.md into `OBJECTIVES.md` as `  - [ ] N.M. Title` under its parent.
- Appends a Timeline entry to OPERATION.md.
- Quality bar: "Could another session implement this by reading ONLY SPEC.md and CLAUDE.md?"

Re-running `/spec` while `## TODO - drafting` is present jumps straight to the Phase 2 menu by default. Extra instructions classify as `rough-edit` (partial revision via the Phase 1 review loop) or `rough-rewrite` (overwrite from scratch).

### Phase 4: Ship (`/ship`)

Implement the elaborated spec, objective by objective.

- **Drafting gate**: `/ship` reads SPEC.md and refuses if `## TODO - drafting` is still present, redirecting the user back to `/spec` to finish elaboration.
- Works through unchecked objectives in OBJECTIVES.md top-to-bottom
- Reads objective details from SPEC.md, implements code changes
- Marks sub-objectives `[x]` in OBJECTIVES.md immediately after completing each one
- Runs formatter and type checker after each top-level objective
- Appends Timeline entries to OPERATION.md
- Updates SPEC.md if implementation deviates (strikethrough on superseded sub-objectives, never deletes)

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
