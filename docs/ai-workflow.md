# Naholo — AI-Assisted Development Workflow

Naholo connects idea capture (in the web app) to plan execution (in local repos with AI agents) via five skills: `/infil` → `/recon` → `/splash` → `/sitrep` → `/exfil`.

## Workflow

### Phase 1: Capture Ideas (Web App)

Create an operation in Naholo and collect context:

- **Logs**: Quick thoughts, requirements, questions — dropped as messenger-style messages. Low friction, append-only.
- **Notes**: Structured reference material — designs, research, references. Tabbed markdown documents with autosave.

This is the brainstorming phase. The operation accumulates everything needed to start work.

### Phase 2: Infil (`/infil {N}`)

Fetch the operation locally for offline-first work.

- `naholo agent pull {N}` creates the local operation directory and pulls `OBJECTIVES.md` plus all existing `notes/*.md` from the server, then prints the absolute directory path on stdout — the `/infil` agent reads that line and does not need a separate `op-path` call
- The agent then generates the two workflow notes if missing (server-authored copies are preserved on re-runs):
  - `notes/OPERATION.md` — the single live document for the OP. Three top-level sections:
    - `## SITUATION` — `### Pain`, `### Goal`, `### Suggested solution` (filled by infil from logs/notes), plus optional transient `### Open questions` block
    - `## MISSION` — `### Concept`, `### Prerequisites`, `### Architecture Decisions` (empty after infil; filled by `/recon`)
    - `## EXECUTION` — one `### OBJ N — Title` section per objective with goal, `#### Target files`, `#### After-Action Report` (empty after infil; populated by `/recon` and `/splash`)
  - `notes/TIMELINE.md` — chronological event log (one bullet per existing server log)
- `OBJECTIVES.md` stays as pulled (empty list until `/recon` populates it); other `notes/*.md` are whatever the operation already had
- On re-run, `naholo agent pull` performs a 3-way merge (local vs server vs baseline) — never silently overwrites local changes

### Phase 3: Recon (`/recon ["freeform"]`)

Research the codebase and define the mission. Replaces the older `/spec` skill.

- Fills `## MISSION` with Concept, Prerequisites, and Architecture Decisions
- Defines `## EXECUTION` as a list of `### OBJ N — Title` ORPs (Operation Rally Points). Each OBJ is sized for one reviewable `/splash`: a goal paragraph (the success criterion), a `#### Target files` bullet list, and an empty `#### After-Action Report`
- Mirrors the OBJ list into `OBJECTIVES.md` as a flat `- [ ] N. Title` checklist (no sub-objectives)
- Prunes any `### Open questions` whose `Answer ->` is still empty
- Resumable — re-running picks up the partial mission/execution state and continues
- **FRAGO mode**: `/recon "freeform text"` treats the args as edit instructions for unfinished OBJs. Completed OBJs (those with non-empty AARs) are immutable; new objectives are inserted as new `### OBJ N` sections

The bar is "could a fresh `/splash` session ship one OBJ by reading only that OBJ's section in OPERATION.md and the project conventions?"

### Phase 4: Splash (`/splash [N] ["freeform"]`)

Implement one OBJ per invocation.

- With `N`, ships OBJ N. Without `N`, picks the next unchecked OBJ from `OBJECTIVES.md`
- Reads the goal + Target files from the OBJ's `### OBJ N` section in OPERATION.md
- Implements the code changes
- Runs formatter and type checker
- Writes the **After-Action Report** into the same OBJ section: what shipped, deviations from plan, key files touched
- Flips `- [ ]` → `- [x]` for that OBJ in `OBJECTIVES.md`
- Appends a `- **{datetime} — splash**: …` bullet to `TIMELINE.md`
- Stops after one OBJ — the user reviews the AAR, then runs `/splash` again for the next

Re-running `/splash N` on an already-shipped OBJ updates the AAR in place rather than appending. Use this for follow-up tweaks on the same OBJ.

### Phase 5: Sync & Close

Two skills for different stages:

**`/sitrep ["freeform"]`** — mid-session checkpoint:

- Syncs objectives and all notes (including `TIMELINE.md`) to server via `naholo agent push`
- Posts a summary log entry via `create_operation_log`
- Appends `- **{datetime} — sitrep**: …` bullet to `TIMELINE.md`
- Leaves local directory intact for continued work

**`/exfil ["close"|"don't close"]`** — final sync and cleanup:

- Same sync as sitrep
- Posts final summary log via `create_operation_log`
- Appends `- **{datetime} — exfil**: …` bullet to `TIMELINE.md`
- Optionally closes the operation via `close_operation`
- Deletes the local operation directory (resolved via `naholo agent op-path {N}`)

## Argument conventions

Only `/infil` takes the operation number. Every other skill resolves the active operation via `naholo agent op-list`.

| Skill     | First arg shape                | Meaning                                                 |
| --------- | ------------------------------ | ------------------------------------------------------- |
| `/infil`  | `{N}` (required)               | Operation number to pull                                |
| `/recon`  | `"freeform"` (optional)        | FRAGO instructions to revise MISSION / unfinished OBJs  |
| `/splash` | `N` or `"freeform"` (optional) | OBJ number; or extra context for the next-unchecked OBJ |
| `/sitrep` | `"freeform"` (optional)        | Extra context for the summary log                       |
| `/exfil`  | `"freeform"` (optional)        | Common values: `"close"`, `"don't close"`               |

## Key Files

| File            | Role                                                                                        | Owned by                                        |
| --------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `OPERATION.md`  | Single live document — SITUATION, MISSION, EXECUTION (with per-OBJ goal, Target files, AAR) | `/infil` creates, `/recon` and `/splash` update |
| `OBJECTIVES.md` | Flat checkbox list mirroring the EXECUTION OBJ headings                                     | `/recon` structures, `/splash` checks off       |
| `TIMELINE.md`   | Chronological event log; pushed as just-another-note                                        | `/infil` seeds, all skills append               |

## MCP Integration

| Tool                   | Used by             | Purpose                     |
| ---------------------- | ------------------- | --------------------------- |
| `create_operation_log` | `/sitrep`, `/exfil` | Post summary log entries    |
| `close_operation`      | `/exfil`            | Close a completed operation |

Objective and note syncing flows through the `naholo agent pull` / `naholo agent push` CLI rather than direct MCP calls, so skills don't manage `.base/` baselines or per-entity MCP tools by hand. The CLI treats `notes/*.md` as opaque markdown — `OPERATION.md`, `TIMELINE.md`, and any free-form notes all sync the same way.
