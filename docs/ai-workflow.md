# Naholo — AI-Assisted Development Workflow

Naholo connects idea capture (in the web app) to plan execution (in local repos with AI agents) via six skills: `/infil` → `/warno` → `/opord` → `/splash` → `/sitrep` → `/exfil`.

## Workflow

### Phase 1: Capture Ideas (Web App)

Create an operation in Naholo and collect context:

- **Logs**: Quick thoughts, requirements, questions — dropped as messenger-style messages. Low friction, append-only.
- **Notes**: Structured reference material — designs, research, references. Tabbed markdown documents with autosave.

This is the brainstorming phase. The operation accumulates everything needed to start work.

### Phase 2: Infil (`/infil [N]`)

Fetch the operation locally for offline-first work. Only one op can be infiled at a time; the local data lives at a fixed `.naholo/local/infiled/` path with op identity stored in `op.yml`.

- **Fresh infil (`/infil {N}`)**: `naholo agent infil {N}` creates the infiled directory, writes `op.yml` (`{ number, title }`), and pulls `TASKS.md` plus all existing `notes/*.md` from the server, then prints the absolute directory path on stdout — the `/infil` agent reads that line and does not need a separate `op-path` call. Errors with "Already infiled" if an op is already infiled
- **Re-infil (`/infil` no args)**: refreshes the currently infiled op via `naholo agent pull` (3-way merge against the server) — no need to exfil first to pick up new server-side changes
- The agent then generates `notes/OPERATION.md` if missing (server-authored copies are preserved on re-runs) — the single live document for the OP, with three top-level sections written incrementally by their owning skills:
  - `## SITUATION` — `### Pain`, `### Suggested solution` (filled by infil from logs/notes), plus optional `### Notes`
  - `## MISSION` — `### Concept of Operations`, `### Warning Orders`, `### Target Reference Points` (absent after infil; appended by `/warno`). Warning Order bullets may carry an optional `- ? <prompt> (a / b) >` sub-bullet (transient open alt) and/or a `- Rejected: a, b` sub-bullet. TRP is a flat bullet list of files / folders / glob patterns (each `` `path` — tag ``) — a curated map a fresh `/opord` session uses to skip re-walking the codebase
  - `## EXECUTION` — one `### TASK N — Title` section per task with `#### Intent`, optional `#### Scheme of Maneuver`, `#### Course of Action`, and a `#### After-Action Report` added by `/splash` when the task ships (absent after infil; appended by `/opord`)
- `TASKS.md` stays as pulled (empty list until `/opord` populates it); `notes/TIMELINE.md` is written by `naholo agent add-timeline` on first call (not seeded at infil); other `notes/*.md` are whatever the operation already had
- On re-infil, `naholo agent pull` performs a 3-way merge (local vs server vs baseline) — never silently overwrites local changes

### Phase 3: Warno (`/warno ["freeform"]`)

Research the codebase and write the mission.

- Appends `## MISSION` to `OPERATION.md` with three subsections: `### Concept of Operations` (two-or-three-sentence overview tying the chosen approach to `SITUATION.Pain`), `### Warning Orders` (flat bulleted decisions, one per line, with optional `- Rejected: …` sub-bullets), and `### Target Reference Points` (flat list of `` `path-or-glob` — tag `` entries — the curated codebase map a fresh `/opord` session reads instead of re-researching)
- May add a `- ? <prompt> (a / b) >` sub-bullet under a Warning Order, but only when the user has named viable options without picking one, or when a well-known alternative is definitively better than the committed path. Otherwise commits to the most viable option found and lets the user override on review. Most operations have none
- **Re-run dispatch**: with no args, fresh write when `## MISSION` is absent. When `## MISSION` is already present, the skill stops and asks the user to either pass freeform args describing the change or delete `## MISSION` and re-run for a fresh write — the skill cannot tell a partial MISSION from a finished one, so it never silently edits
- Freeform args are MISSION-scoped (revise Concept of Operations, swap Warning Orders, refresh Target Reference Points)
- Runs `naholo agent add-timeline -T warno '<summary>'` once the MISSION write completes
- Does NOT write `## EXECUTION` or mirror to `TASKS.md` — those belong to `/opord`

### Phase 4: Opord (`/opord ["freeform"]`)

Cut the warno'd MISSION into ORP-sized tasks.

- Reads the populated `## MISSION` and resolves any `- ? <prompt> (a / b) >` sub-bullets under Warning Orders: empty answer collapses the alts into `- Rejected: a, b`; an answer matching an alt swaps the WO bold label and moves the original chosen path into `- Rejected:`
- Appends `## EXECUTION` with one `### TASK N — Title` section per task. Each task has a `#### Intent` (success criterion), an optional `#### Scheme of Maneuver` (ASCII diagram for control flow / UI / signature changes), and a `#### Course of Action` listing atomic Add / Edit / Move / Delete / Run / Manual steps with top-level-export sub-bullets. The `#### After-Action Report` heading is NOT written by `/opord` — `/splash` adds it when the task ships
- Mirrors the task list into `TASKS.md` as a flat `- [ ] N. Title` checklist (no sub-tasks)
- **Re-run dispatch**: with no args, fresh write when `## EXECUTION` is absent. When `## EXECUTION` is already present, the skill stops and asks the user to either pass freeform args describing the change or delete `## EXECUTION` (and clear `TASKS.md`) and re-run for a fresh write — same reasoning as `/warno`, partial vs finished is indistinguishable
- **Plan revisions**: when `## EXECUTION` is already present, `/opord "freeform text"` treats the args as edit instructions for unfinished tasks — insert, drop, split, merge, retitle, rewrite. New tasks append at the next free integer; existing tasks are never re-slotted. Completed tasks (those with a `#### After-Action Report` heading) are immutable
- Runs `naholo agent add-timeline -T opord '<summary>'` once the EXECUTION write or revision completes

The bar is "could a fresh `/splash` session ship one task by reading only that task's section in OPERATION.md and the project conventions?"

### Phase 5: Splash (`/splash [N] ["freeform"]`)

Implement one task per invocation.

- With `N`, ships TASK N. Without `N`, picks the next unchecked task from `TASKS.md`
- Reads the Intent + Course of Action from the task's `### TASK N` section in OPERATION.md
- Implements the code changes
- Runs formatter and type checker
- Adds the `#### After-Action Report` heading + body to the same task section: deviations, notes (COA stats — planned / done / deviations — are printed in the chat summary, not written to the AAR)
- Flips `- [ ]` → `- [x]` for that task in `TASKS.md`
- Runs `naholo agent add-timeline -T splash '<summary>'` (bare stage label; CLI writes the bullet)
- Stops after one task — the user reviews the AAR, then runs `/splash` again for the next

Re-running `/splash N` on an already-shipped task overwrites the AAR body in place rather than appending. Use this for follow-up tweaks on the same task.

### Phase 6: Sync & Close

Two skills for different stages:

**`/sitrep ["freeform"]`** — mid-session checkpoint:

- Syncs tasks and all notes (including `TIMELINE.md`) to server via `naholo agent sitrep --log <content>`
- Posts a summary log entry via `create_operation_log`
- Runs `naholo agent add-timeline -T sitrep '<summary>'`
- Leaves local directory intact for continued work

**`/exfil ["close"|"don't close"]`** — final sync and cleanup:

- Same sync as sitrep
- Posts final summary log via `create_operation_log`
- Runs `naholo agent add-timeline -T exfil '<summary>'`
- Optionally closes the operation via `close_operation`
- Deletes the local operation directory (resolved via `naholo agent op-path`)

## Post-skill phase

Once a phase-changing skill returns, the session stays in that skill's **phase** until a different phase-changing skill runs (`/infil`, `/warno`, `/opord`, `/splash`), `/exfil` cleans up the workflow, or the session ends. `/sitrep` is a sync-only operation and does **not** end the phase. The phase is the basis for two rules:

- **In-phase follow-up edits** — if the user asks for a change that belongs to the current phase (a MISSION tweak after `/warno`, a plan revision after `/opord`, an AAR edit or late-discovered deviation after `/splash`, a SITUATION fix after `/infil`), the agent applies it and fires `naholo agent add-timeline -T <stage> '<summary>'` so a future fresh session sees what changed. The CLI owns timestamp + bullet format.
- **Wrong-phase requests** — if the user asks for work that belongs to a different skill (e.g. they're in the `splash` phase and ask to rewrite MISSION), the agent does **not** silently do it. It tells the user to run the proper skill (`/warno`, `/opord`, etc.) and stops.

Only `/infil`, `/warno`, `/opord`, and `/splash` own a meaningful post-skill phase; `/sitrep` and `/exfil` are pure sync operations and have nothing to anchor a phase to.

## Argument conventions

Only `/infil` takes the operation number, and only on a fresh infil. Every other skill resolves the active operation via `naholo agent op` (which reads `op.yml` and prints `#{N} {title}`).

| Skill     | First arg shape                | Meaning                                                                           |
| --------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `/infil`  | `{N}` or none                  | Op number for fresh infil; no args to re-infil (refresh)                          |
| `/warno`  | `"freeform"` (optional)        | MISSION-scoped instructions to revise Concept / WARNORDs                          |
| `/opord`  | `"freeform"` (optional)        | Plan-revision instructions for unfinished tasks (insert / split / retitle / drop) |
| `/splash` | `N` or `"freeform"` (optional) | Task number; or extra context for the next-unchecked task                         |
| `/sitrep` | `"freeform"` (optional)        | Extra context for the summary log                                                 |
| `/exfil`  | `"freeform"` (optional)        | Common values: `"close"`, `"don't close"`                                         |

## Key Files

| File           | Role                                                                                                                   | Owned by                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `OPERATION.md` | Single live document — SITUATION, MISSION, EXECUTION (with per-task Intent, Scheme of Maneuver, Course of Action, AAR) | `/infil` creates SITUATION, `/warno` adds MISSION, `/opord` adds EXECUTION, `/splash` adds AARs |
| `TASKS.md`     | Flat checkbox list mirroring the EXECUTION TASK headings                                                               | `/opord` structures + inserts, `/splash` checks off                                             |
| `TIMELINE.md`  | Chronological catch-up log for fresh sessions that lack in-context history; pushed as just-another-note                | `naholo agent add-timeline` (invoked by each skill, plus by post-skill in-phase edits)          |

## MCP Integration

| Tool                   | Used by             | Purpose                     |
| ---------------------- | ------------------- | --------------------------- |
| `create_operation_log` | `/sitrep`, `/exfil` | Post summary log entries    |
| `close_operation`      | `/exfil`            | Close a completed operation |

Task and note syncing flows through the `naholo agent infil` / `naholo agent pull` / `naholo agent sitrep` / `naholo agent exfil` CLI rather than direct MCP calls, so skills don't manage `.base/` baselines or per-entity MCP tools by hand. The CLI treats `notes/*.md` as opaque markdown — `OPERATION.md`, `TIMELINE.md`, and any free-form notes all sync the same way.
