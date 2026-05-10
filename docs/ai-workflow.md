# Naholo — AI-Assisted Development Workflow

Naholo connects idea capture (in the web app) to plan execution (in local repos with AI agents) via six skills: `/infil` → `/recon` → `/objs` → `/splash` → `/sitrep` → `/exfil`.

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
  - `notes/OPERATION.md` — the single live document for the OP. Three top-level sections, written incrementally by their owning skills:
    - `## SITUATION` — `### Pain`, `### Suggested solution` (filled by infil from logs/notes), plus optional `### Notes`
    - `## MISSION` — `### Concept of Operations`, `### Prerequisites`, `### Warning Orders` (absent after infil; appended by `/recon`). Warning Order bullets may carry an optional `- ? <prompt> (a / b) >` sub-bullet (transient open alt) and/or a `- Rejected: a, b` sub-bullet
    - `## EXECUTION` — one `### OBJ N — Title` section per objective with `#### Goal`, optional `#### Scheme of Maneuver`, `#### Course of Action`, and a `#### After-Action Report` added by `/splash` when the OBJ ships (absent after infil; appended by `/objs`)
  - `notes/TIMELINE.md` — chronological event log (one bullet per existing server log)
- `OBJECTIVES.md` stays as pulled (empty list until `/objs` populates it); other `notes/*.md` are whatever the operation already had
- On re-run, `naholo agent pull` performs a 3-way merge (local vs server vs baseline) — never silently overwrites local changes

### Phase 3: Recon (`/recon ["freeform"]`)

Research the codebase and define the mission.

- Appends `## MISSION` to `OPERATION.md` with three subsections: `### Concept of Operations` (two-or-three-sentence overview tying the chosen approach to `SITUATION.Pain`), `### Prerequisites` (bullet list of what must exist before any OBJ can ship), and `### Warning Orders` (flat bulleted decisions, one per line, with optional `- Rejected: …` sub-bullets)
- May add a `- ? <prompt> (a / b) >` sub-bullet under a Warning Order, but only when the user has named viable options without picking one, or when a well-known alternative is definitively better than the committed path. Otherwise commits to the most viable option found and lets the user override on review. Most operations have none
- Resumable — re-running picks up where the previous run left off; freeform args are MISSION-scoped (revise Concept of Operations, swap Warning Orders, etc.)
- Does NOT write `## EXECUTION` or mirror to `OBJECTIVES.md` — those belong to `/objs`

### Phase 4: Objs (`/objs ["freeform"]`)

Cut the recon'd MISSION into ORP-sized OBJs.

- Reads the populated `## MISSION` and resolves any `- ? <prompt> (a / b) >` sub-bullets under Warning Orders: empty answer collapses the alts into `- Rejected: a, b`; an answer matching an alt swaps the WO bold label and moves the original chosen path into `- Rejected:`
- Appends `## EXECUTION` with one `### OBJ N — Title` section per OBJ. Each OBJ has a `#### Goal` (success criterion), an optional `#### Scheme of Maneuver` (ASCII diagram for control flow / UI / signature changes), and a `#### Course of Action` listing atomic Add / Edit / Delete / Run steps with top-level-export sub-bullets. The `#### After-Action Report` heading is NOT written by `/objs` — `/splash` adds it when the OBJ ships
- Mirrors the OBJ list into `OBJECTIVES.md` as a flat `- [ ] N. Title` checklist (no sub-objectives)
- Resumable — re-running picks up the partial EXECUTION state and continues
- **FRAGO mode**: `/objs "freeform text"` treats the args as edit instructions for unfinished OBJs (split, merge, retitle, insert, drop). Completed OBJs (those with a `#### After-Action Report` heading) are immutable; new objectives are inserted as new `### OBJ N` sections

The bar is "could a fresh `/splash` session ship one OBJ by reading only that OBJ's section in OPERATION.md and the project conventions?"

### Phase 5: Splash (`/splash [N] ["freeform"]`)

Implement one OBJ per invocation.

- With `N`, ships OBJ N. Without `N`, picks the next unchecked OBJ from `OBJECTIVES.md`
- Reads the Goal + Course of Action from the OBJ's `### OBJ N` section in OPERATION.md
- Implements the code changes
- Runs formatter and type checker
- Adds the `#### After-Action Report` heading + body to the same OBJ section: what shipped, deviations from plan, notes, splashed files
- Flips `- [ ]` → `- [x]` for that OBJ in `OBJECTIVES.md`
- Appends a `- **{datetime} — splash**: …` bullet to `TIMELINE.md`
- Stops after one OBJ — the user reviews the AAR, then runs `/splash` again for the next

Re-running `/splash N` on an already-shipped OBJ overwrites the AAR body in place rather than appending. Use this for follow-up tweaks on the same OBJ.

### Phase 6: Sync & Close

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

| Skill     | First arg shape                | Meaning                                                       |
| --------- | ------------------------------ | ------------------------------------------------------------- |
| `/infil`  | `{N}` (required)               | Operation number to pull                                      |
| `/recon`  | `"freeform"` (optional)        | MISSION-scoped instructions to revise Concept / WARNORDs      |
| `/objs`   | `"freeform"` (optional)        | FRAGO instructions to revise unfinished OBJs (split / insert) |
| `/splash` | `N` or `"freeform"` (optional) | OBJ number; or extra context for the next-unchecked OBJ       |
| `/sitrep` | `"freeform"` (optional)        | Extra context for the summary log                             |
| `/exfil`  | `"freeform"` (optional)        | Common values: `"close"`, `"don't close"`                     |

## Key Files

| File            | Role                                                                                                                | Owned by                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `OPERATION.md`  | Single live document — SITUATION, MISSION, EXECUTION (with per-OBJ Goal, Scheme of Maneuver, Course of Action, AAR) | `/infil` creates SITUATION, `/recon` adds MISSION, `/objs` adds EXECUTION, `/splash` adds AARs |
| `OBJECTIVES.md` | Flat checkbox list mirroring the EXECUTION OBJ headings                                                             | `/objs` structures, `/splash` checks off                                                       |
| `TIMELINE.md`   | Chronological event log; pushed as just-another-note                                                                | `/infil` seeds, all skills append                                                              |

## MCP Integration

| Tool                   | Used by             | Purpose                     |
| ---------------------- | ------------------- | --------------------------- |
| `create_operation_log` | `/sitrep`, `/exfil` | Post summary log entries    |
| `close_operation`      | `/exfil`            | Close a completed operation |

Objective and note syncing flows through the `naholo agent pull` / `naholo agent push` CLI rather than direct MCP calls, so skills don't manage `.base/` baselines or per-entity MCP tools by hand. The CLI treats `notes/*.md` as opaque markdown — `OPERATION.md`, `TIMELINE.md`, and any free-form notes all sync the same way.
