# Naholo Agent Manual

This is the single source of truth for how AI agents work with Naholo operations. Skills (`/infil`, `/warno`, `/opord`, `/frago`, `/splash`, `/sitrep`, `/exfil`) reference this manual instead of re-explaining workflow and file formats.

## Terminology

| Entity    | Acronym | Familiar Term  | Familiar Context                  |
| --------- | ------- | -------------- | --------------------------------- |
| Operation | OP      | issue          | GitHub Issues                     |
| Task      | —       | task           | tasks within an issue             |
| Operator  | OPR     | project member | GitHub / general PM               |
| Campaign  | —       | milestone/epic | GitHub Milestones / PM tool epics |

Users may refer to entities by any column — entity name or familiar term. For example, "task 1" and "issue #42" resolve to a specific task within operation #42.

Operational vocabulary used by the skills (written in full in docs; may be abbreviated in agent chat):

- **ORP** — Operation Rally Point. The unit of work for a single task: scoped, reviewable, ships in one `/splash`.
- **AAR** — After-Action Report. The on-disk record of what actually happened during a `/splash`. Lives inside each task's section.
- **CONOPS** — Concept of Operations. The two-or-three-sentence overview that opens MISSION: names the chosen approach and ties it back to `SITUATION.Pain`. Concept-level only — file lists and edit steps belong in Warning Orders, not here.
- **WARNORD** — Warning Order. One bulleted decision inside MISSION's `### Warning Orders` subsection — one sentence per decision.
- **OPORD** — Operation Order. The detail-cutting brief: the MISSION broken into ordered, ship-sized tasks, each with a Course of Action. `/opord` writes the OPORD into `## EXECUTION` (one `### TASK N — Title` per ORP) and mirrors the task list to `TASKS.md`.
- **COA** — Course of Action. The per-task action list inside EXECUTION. Each item names an explicit step (Add / Edit / Move / Delete / Run / Manual) so non-file work (migrations, rebuilds) is first-class. `Manual:` items are user-owned — `/splash` pauses for the user instead of executing them. Sub-bullets list only top-level exported symbols.
- **FRAGO** — Fragmentary Order. Mid-cycle insertion of a single new task via `/frago`. The new task gets a **positional letter suffix** keyed to an anchor task (`TASK 3` → `TASK 3a`, then `3b`, `3c`, …) and never renumbers downstream tasks. The suffix is a label, not a hierarchy — `3a` is a flat sibling of `TASK 3`, not a child of it. Multi-task revisions and full plan rewrites use `/opord` instead.

## Workflow

The agent-facing lifecycle for an operation is a one-way pipeline from server to local, then back:

1. **`/infil [n]`** — Two modes. **Fresh infil (`/infil {n}`)**: takes an operation number from the server. Runs `naholo agent infil {n}`, which creates the infiled directory at `.naholo/local/infiled/`, writes `op.yml` (`{ number, title }`), pulls `TASKS.md` and all existing `notes/*.md` (plus `.base/` copies), and prints the absolute directory path to stdout — read it from there; do not run `op-path` during `/infil`. Errors with "Already infiled. Run \"naholo agent exfil\" first." when an op is already infiled — only one op can be infiled at a time. **Re-infil (`/infil` no args)**: refreshes the currently infiled op via `naholo agent pull` (3-way merges tasks + notes against the latest server state). Either way, the agent then generates the workflow notes if missing: `notes/OPERATION.md` (containing **only** `## SITUATION`, filled from logs/notes — `## MISSION` and `## EXECUTION` are absent and will be appended by their owning skills) and `notes/TIMELINE.md` (one bullet per existing log entry). `TASKS.md` stays as pulled (empty list, ready for `/warno`). Never pushes.
2. **`/warno ["freeform"]`** — Input: infiled operation. The MISSION-writing skill. Researches the codebase and **appends `## MISSION`** (heading + Concept of Operations / Warning Orders / Target Reference Points) to `OPERATION.md` when MISSION is absent; revises in place when it already exists. Does NOT touch `## EXECUTION` or `TASKS.md` — those are `/opord`'s job. Resumable — re-running picks up where the previous run left off. Freeform args are MISSION-scoped (revise Concept of Operations, swap Warning Orders, refresh Target Reference Points); EXECUTION-shaped instructions belong to `/opord` (or `/frago` for single insertions). Stops with a "next: `/opord`" pointer.
3. **`/opord ["freeform"]`** — Input: warno-completed operation (MISSION populated). OPORD-style detail-cutter. Resolves any unanswered Warning Order alternatives, cuts MISSION into ORP-sized tasks, **appends `## EXECUTION`** (one `### TASK N — Title` per task with `#### Intent` + `#### Scheme of Maneuver` when applicable + `#### Course of Action`; **no `#### After-Action Report` heading** — `/splash` adds that when it ships the task), and mirrors the task list into `TASKS.md` as a flat checkbox list. Re-runs handle multi-task revisions and full restarts: edit unfinished tasks only; never touch completed tasks (those with a populated AAR). Single-task insertions are `/frago`'s job, not `/opord`'s.
4. **`/frago "freeform"`** — Input: opord-completed operation. Inserts exactly one new `### TASK N{letter} — Title` (positional letter suffix keyed to an anchor task: `3a`, `3b`, …) next to that anchor, mirrors the new task into `TASKS.md`, and revises any immediately downstream unfinished tasks whose contract the new task changes. **Never renumbers** — letter suffixes exist to make renumbering unnecessary. **The suffix is positional, not hierarchical**: the new task is a flat sibling of its anchor, never a child (no `parentTaskId`). Never edits completed tasks. For broader plan rewrites, use `/opord`.
5. **`/splash [N] ["freeform"]`** — Input: opord-completed operation with at least one unchecked task. With `N`, ships TASK N. Without `N`, picks the next unchecked task from `TASKS.md`. Reads the task's Intent + Course of Action from OPERATION.md, implements code, runs format + typecheck, **adds the `#### After-Action Report` heading + body** to the target task section (or overwrites the body in place when shipping a revision splash), flips `- [ ]` → `- [x]` in TASKS.md, appends a TIMELINE.md bullet. Stops after one task.
6. **`/sitrep ["freeform"]`** — Input: local dir with progress. Output: server synced (tasks + all notes including TIMELINE.md), summary log posted. Does not close. Optional freeform args become extra context for the summary log.
7. **`/exfil ["close"|"don't close"]`** — Input: finished local dir. Output: server synced, summary log posted, optionally closes operation, deletes local dir.

The canonical happy-path cycle: `/infil → /warno → /opord → /splash → (user reviews AAR) → /splash → … → /exfil`. FRAGO loop: `/frago "freeform"` between splashes inserts a new task next to the last shipped one; `/opord "freeform"` handles multi-task revisions; re-run `/warno` for direction (MISSION) changes.

## Notes

Three workflow notes have a fixed contract. All other notes are free-form.

### OPERATION.md

The single live document per OP. `/infil` writes SITUATION, `/warno` appends MISSION, `/opord` appends EXECUTION, `/splash` adds each task's AAR when it ships. Layout:

- **Heading**: `# OP #{n}: {title}`
- **Sections (in fixed order when present; only `## SITUATION` is mandatory)**: top-level sections appear only when their owning skill has written them. After `/infil` only `## SITUATION` exists; `## MISSION` is appended by `/warno`; `## EXECUTION` is appended by `/opord`. No empty section headers, no placeholder bodies — if a section is absent, the skill that owns it hasn't run yet.
  - `## SITUATION` — context. Subsections:
    - `### Pain` — the problem statement.
    - `### Suggested solution` — first-pass idea; may be absent.
    - `### Notes` — supplementary one-line bullets pointing at `notes/*.md` or `LOGS.yml`; may be absent.
  - `## MISSION` — plan. Appended by `/warno`. Three subsections (in order):
    - `### Concept of Operations` — two-or-three-sentence overview.
    - `### Warning Orders` — flat bullet list, one decision per bullet, one sentence each. Two optional sub-bullet forms under a decision: `- ? <prompt> (a / b) >` (transient open alt resolved by `/opord`) and `- Rejected: a, b` (alternatives that were considered and dismissed).
    - `### Target Reference Points` — flat bullet list of files / folders / glob patterns a fresh downstream session needs to read. Each entry is `` `{path-or-glob}` — {tag} ``: backtick-wrapped path (folders end with `/`, globs use standard wildcards), then a noun-only tag of a few words (no verbs, no clauses). No sub-bullets. Curated map, not a research log — prefer a folder or glob over enumerating siblings.
  - `## EXECUTION` — per-task workspace. Appended by `/opord`. One `### TASK N — {title}` subsection per task, in order; FRAGO-inserted tasks use a positional letter suffix (`### TASK 3a — {title}`) keyed to an anchor task. The list is **flat** — no sub-tasks, no parent-child relationships. Each task section contains:
    - `#### Intent` — one or two sentences naming the success criterion `/splash` uses to know when the task is done. Not a re-narration of what's changing.
    - `#### Scheme of Maneuver` (optional) — ASCII diagram of the new flow, wireframe of the UI, or before/after signature diff. A numbered list is acceptable for trivially linear flows.
    - `#### Course of Action` — the atomic action list (Add / Edit / Move / Delete / Run / Manual). Sub-bullets list only top-level exported symbols, one-liner each. Sub-bullets are file-local annotations, not sub-tasks.
    - `#### After-Action Report` — added by `/splash` when the task ships (and overwritten in place on revision splashes). Its presence is the "shipped" signal. Format contract is owned by the splash skill.

- **No other top-level sections**: only the three above are allowed — do not invent new `##` headings. Timeline lives in TIMELINE.md. Per-task progress lives in EXECUTION's AARs.
- **Shipped signal**: the presence of `#### After-Action Report` under a task section means that task has shipped. Absence means it is still open.

### TASKS.md

The canonical checklist. The only file with checkboxes. Flat — no sub-tasks.

- **Heading**: `# TASKS — OP #{n}`
- Every task is `- [ ] {n}. {short title}` (e.g., `- [ ] 1. Add man command`). FRAGO insertions use the letter-suffix form (e.g., `- [ ] 3a. Backfill script`). No indentation, no sub-bullets.
- `[ref](naholo://tasks/{id})` links point at the server-side task record; `naholo agent push` appends them for newly created tasks.

### TIMELINE.md

The chronological event log. Separate note (was previously `## Timeline` inside OPERATION.md).

- **Heading**: `# TIMELINE — OP #{n}`
- Body is a single chronological bullet list. Format: `- **{YYYY-MM-DD HH:MM} — {stage-or-author}**: {summary}`.
- Stage labels used by skills: `warno`, `opord`, `frago`, `splash`, `sitrep`, `exfil`. Other authors (server log entries seeded at infil) appear by name.

### Listing order

When a skill prints a list of notes (infil summary, sitrep recap, etc.), the order is:

1. `OPERATION`
2. `TASKS`
3. `TIMELINE`
4. All other notes, sorted alphabetically.

## Commands

Only one op can be infiled at a time. The agent CLI is a small state machine: `infil` enters the infiled state, `pull`/`push`/`op-path`/`op` operate on it, `exfil` exits. State is persisted as `op.yml` at the infiled root. Commands that need an infiled op error with `No infiled operation. Run "naholo agent infil <n>" first.` when none exists.

### `naholo agent infil <n>`

Initial fetch. Takes the server op number, creates `.naholo/local/infiled/`, writes `op.yml`, and pulls tasks/notes/.base/LOGS.yml. Errors with `Already infiled. Run "naholo agent exfil" first.` when an op is already infiled. Agents use this during `/infil`.

### `naholo agent pull`

Argless refresh-only. Reads the op number from `op.yml` and runs the 3-way merge against the server.

- 3-way merges notes line-by-line (via diff3) and structurally merges tasks by ID. Reports `updated`/`kept-local`/`merged`/`conflict`/`created`/`unchanged` per file.
- Refreshes `op.yml.title` from the server.
- Errors with `No infiled operation` when nothing is infiled. Switching ops requires `exfil` then `infil`. Never runs pushes.

### `naholo agent push`

Argless. Pushes local changes to the server.

- Reads the op number from `op.yml`.
- Reads `TASKS.md` and syncs the task tree (creates new tasks, updates existing by `[ref]` id).
- Patches newly created tasks with `[ref](naholo://tasks/{id})` links in the local file.
- Reads every `notes/*.md` (including `TIMELINE.md`) and creates or updates the corresponding server note.
- Updates `.base/` with the just-pushed state as the new baseline for future 3-way merges.
- Outputs sync counts. Agents use this during `/sitrep` and `/exfil`.

### `naholo agent op-path`

Argless. Prints the absolute infiled directory (`.naholo/local/infiled/`). Skills resolve the operation directory through this command — never hardcode `.naholo/local/infiled/...` paths.

### `naholo agent op`

Argless. Prints `#{number} {title}` for the infiled op. Errors with `No infiled operation` when nothing is infiled. Skills use this to discover the active op number/title.

### `naholo agent man`

Prints this manual to stdout. No arguments, no I/O. Skills run it once per session (mirroring the `naholo://soul` pattern) and adopt the rules.

## Chat output

When printing an end-of-skill summary to the user (infil recap, warno summary, splash AAR digest, sitrep/exfil report), output raw markdown lines directly — **never wrap the summary block in a codeblock fence**. Fenced summaries break `[text](path)` link rendering in the Naholo UI. Files written to disk can still contain fenced code examples; this rule applies only to chat output.

### Link format

Summary links into `OPERATION.md` / `TIMELINE.md` use a **semantic label** and a **line-anchored URL** — the `#L<line>` lives in the URL only, never in the link label. The label is the noun the reader is opening: a top-level section (`MISSION`, `EXECUTION`), a task (`TASK 2`), a task's AAR (`TASK 1 - AAR`), or the file itself when there is no narrower target (`OPERATION.md`, `TIMELINE.md`). Resolve `<line>` by reading back the file the skill just wrote and locating the matching heading.

Rendered shapes:

- Section target: `[MISSION](/abs/path/notes/OPERATION.md#L13)`
- Task target: `[TASK 2](/abs/path/notes/OPERATION.md#L68)`
- AAR target: `[TASK 1 - AAR](/abs/path/notes/OPERATION.md#L61)`
- Whole-file target (no specific heading): `[OPERATION.md](/abs/path/notes/OPERATION.md)`
