# Naholo — AI-Assisted Development Workflow

Naholo connects idea capture (in the web app) to plan execution (in local repos with AI agents) via five skills: `/infil` → `/spec` → `/ship` → `/sitrep` → `/exfil`.

## Workflow

### Phase 1: Capture Ideas (Web App)

Create an operation in Naholo and collect context:

- **Logs**: Quick thoughts, requirements, questions — dropped as messenger-style messages. Low friction, append-only.
- **Notes**: Structured reference material — specs, API designs, research. Tabbed markdown documents with autosave.

This is the brainstorming phase. The operation accumulates everything needed to start work.

### Phase 2: Infil (`/infil {N}`)

Fetch the operation locally for offline-first work.

- Pulls objectives, notes, and logs from Naholo via the `naholo agent pull` CLI
- Creates `.naholo/local/operations/{N}/` with:
  - `OBJECTIVES.md` — checkbox objective list mirroring server state
  - `notes/OPERATION.md` — structured context document with exactly four sections:
    - `## Pain` — what's wrong or missing (≤3 sentences)
    - `## Resolution` — how we plan to fix it (≤3 sentences)
    - `## Open questions` — questions for the user to answer before `/spec`
    - `## Timeline` — chronological log summary, appended to by every subsequent skill
  - `notes/*.md` — any other notes from the operation
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
  - **`## TODO - drafting`** — transient checklist (one entry per top-level objective) that gates elaboration. Lives immediately before `## Objectives` and is deleted only at the Finalize gate.
  - **Objectives** — `### N. Title` headings each with 1–3 sentence descriptions. **No `- N.M.` sub-bullets yet.**
  - **Notes** — edge cases, gotchas, deferred decisions
- Surfaces SPEC.md via a clickable markdown link in chat so the user can review in their editor.
- Rough plan is written; SPEC.md link surfaced; skill proceeds directly to the Phase 2 entry menu — no separate approval gate.

**Phase 2 — Elaboration**: fill in `- N.M.` sub-bullets under each `### N.`. Mode chosen via `AskUserQuestion` (header `Elaborate`) with two declared options:

- **Elaborate all** — fills every section in one batched edit, ticks all TODO boxes, then proceeds to the Finalize gate.
- **Elaborate per section** — loops unchecked sections (resume support), drafts sub-bullets per section, then asks a `Continue?` checkpoint with two declared options ("Next section" / "Finish all remaining") before moving on.

A third "Other" branch is auto-appended on every `AskUserQuestion`. On the Phase 2 entry menu and per-section checkpoint, "Other" + free-text covers rough-plan revisions (Goal / Architecture Decisions / Affected files / `### N.` titles + descriptions) and freeform edits anywhere in SPEC.md, then re-asks the same question. Every question's text ends with the standard escape-hatch hint so the "Other" path is discoverable.

**Finalize gate**: after the last box ticks, a `Finalize` `AskUserQuestion` offers "Squash spec timeline and finalize" or "Finalize as-is"; the `## TODO - drafting` section is deleted only when the user picks one of those finalize options.

- The squash branch collapses the session's iterative `(rough)` / `(rough revised)` / `(revised)` Timeline bullets into a single `(finalized)` bullet — cuts token cost, prevents downstream agents from reading superseded design as live.
- The as-is branch preserves the deviation history alongside an appended `(elaborated)` bullet — useful when downstream reviewers benefit from seeing the iteration trail.
- "Other" with free-text routes to freeform spec revisions, then re-asks the same Finalize question.

After the Finalize gate runs:

- Mirrors every `- N.M.` sub-bullet from SPEC.md into `OBJECTIVES.md` as `  - [ ] N.M. Title` under its parent.
- Appends the Timeline entry (squashed or as-is) to OPERATION.md.
- Quality bar: "Could another session implement this by reading ONLY SPEC.md and CLAUDE.md?"

Re-running `/spec` while `## TODO - drafting` is present jumps straight to the Phase 2 menu by default. Extra instructions classify as `rough-edit` (apply the described edits to the existing SPEC.md and proceed to the Phase 2 entry menu — no review-loop) or `rough-rewrite` (overwrite from scratch).

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

- Syncs objectives and notes to server via `naholo agent push`
- Posts a summary log entry via `create_operation_log`
- Appends Timeline entry to OPERATION.md
- Leaves local directory intact for continued work

**`/exfil {N}`** — final sync and cleanup:

- Same sync as sitrep
- Posts final summary log via `create_operation_log`
- Appends Timeline entry to OPERATION.md
- Optionally closes the operation via `close_operation`
- Deletes the local `.naholo/local/operations/{N}/` directory

## Key Files

| File            | Role                                                                                 | Owned by                               |
| --------------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| `OPERATION.md`  | Evolving context — exactly four sections: Pain, Resolution, Open Questions, Timeline | `/infil` creates, all skills append    |
| `SPEC.md`       | Executable specification: Goal, Architecture, Objectives with file paths             | `/spec` creates, `/ship` may update    |
| `OBJECTIVES.md` | Progress tracker: checkbox list mirroring spec objectives                            | `/spec` structures, `/ship` checks off |

## MCP Integration

| Tool                   | Used by             | Purpose                     |
| ---------------------- | ------------------- | --------------------------- |
| `create_operation_log` | `/sitrep`, `/exfil` | Post summary log entries    |
| `close_operation`      | `/exfil`            | Close a completed operation |

Objective and note syncing flows through the `naholo agent pull` / `naholo agent push` CLI rather than direct MCP calls, so skills don't manage `.base/` baselines or per-entity MCP tools by hand.
