# Naholo Agent Manual

This is the single source of truth for how AI agents work with Naholo operations. Skills (`/infil`, `/warno`, `/opord`, `/splash`, `/sitrep`, `/exfil`, `/recon`) reference this manual instead of re-explaining workflow and file formats.

## Terminology

| Entity    | Acronym | Familiar Term  | Familiar Context                  |
| --------- | ------- | -------------- | --------------------------------- |
| Operation | OP      | issue          | GitHub Issues                     |
| Task      | —       | task           | tasks within an issue             |
| Operator  | OPR     | project member | GitHub / general PM               |
| Campaign  | —       | milestone/epic | GitHub Milestones / PM tool epics |

Users may refer to entities by any column — entity name or familiar term. For example, "task 1" and "issue #42" resolve to a specific task within operation #42.

Operational vocabulary used by the skills (written in full in docs; may be abbreviated in agent chat):

- **Single-commit-sized task** — the sizing bar for one task: one cohesive change a reviewer can read as a single diff, ships in one `/splash`. See `/opord`'s `Single-commit sizing rules` for the full definition.
- **AAR** — After-Action Report. The on-disk record of what actually happened during a `/splash`. Lives inside each task's section.
- **CONOPS** — Concept of Operations. The two-or-three-sentence overview that opens MISSION: names the chosen approach and ties it back to `SITUATION.Pain`. Concept-level only — file lists and edit steps belong in Warning Orders, not here.
- **WARNORD**, **WARNO** — Warning Order. One bulleted decision inside MISSION's `### Warning Orders` subsection — one sentence per decision.
- **OPORD** — Operation Order. The detail-cutting brief: the MISSION broken into ordered, ship-sized tasks, each with a Course of Action. `/opord` writes the OPORD into `## EXECUTION` (one `### TASK N — Title` per task) and mirrors the task list to `TASKS.md`. Re-runs handle all plan revisions — insert, drop, split, merge, retitle, rewrite unfinished tasks — with new tasks appended at the next free integer.
- **COA** — Course of Action. The per-task action list inside EXECUTION. Each item names an explicit step (Add / Edit / Move / Delete / Run / Manual) so non-file work (migrations, rebuilds) is first-class. `Manual:` items are user-owned — `/splash` pauses for the user instead of executing them. Sub-bullets list only top-level exported symbols.

## Workflow

The agent-facing lifecycle for an operation is a one-way pipeline from server to local, then back:

1. **`/infil [n]`** — Two modes. **Fresh infil (`/infil {n}`)** pulls operation `{n}` from the server into the local infiled directory. **Re-infil (`/infil` no args)** refreshes the currently infiled op via 3-way merge. Either mode seeds `notes/OPERATION.md` if missing (only `## SITUATION`, filled from logs/notes — `## MISSION` and `## EXECUTION` are appended by their owning skills). Only one op can be infiled at a time; never pushes.
2. **`/warno ["freeform"]`** — Input: infiled operation. The MISSION-writing skill. Researches the codebase and **appends `## MISSION`** (heading + Concept of Operations / Warning Orders / Target Reference Points) to `OPERATION.md` when MISSION is absent; revises in place when it already exists. Does NOT touch `## EXECUTION` or `TASKS.md` — those are `/opord`'s job. Resumable — re-running picks up where the previous run left off. Freeform args are MISSION-scoped (revise Concept of Operations, swap Warning Orders, refresh Target Reference Points); EXECUTION-shaped instructions belong to `/opord`. Stops with a "next: `/opord`" pointer.
3. **`/raid ["freeform"]`** — Input: fresh infiled operation (no `## MISSION` and no `## EXECUTION` yet). The `/warno` + `/opord` collapse for small ops where architecture review is overkill. Researches the codebase, appends `## MISSION` to `OPERATION.md` with a real Concept of Operations + real Target Reference Points but `### Warning Orders` body marked `_N/A_`, then chains `/opord` via the `Skill` tool to cut tasks and mirror `TASKS.md`. Forwards freeform args to the chained `/opord`. Aborts when MISSION or EXECUTION already exists — use `/warno` or `/opord` for revisions. Lands the session in the post-opord phase (the chained `/opord` declares it).
4. **`/opord ["freeform"]`** — Input: warno-completed operation (MISSION populated). OPORD-style detail-cutter and plan revisor. Resolves any unanswered Warning Order alternatives, cuts MISSION into single-commit-sized tasks, **appends `## EXECUTION`** (one `### TASK N — Title` per task with `#### Intent` + `#### Scheme of Maneuver` when applicable + `#### Course of Action`; **no `#### After-Action Report` heading** — `/splash` adds that when it ships the task), and mirrors the task list into `TASKS.md` as a flat checkbox list. With `## EXECUTION` already present, freeform args drive plan revisions — insert, drop, split, merge, retitle, rewrite — applied only to unfinished tasks. Completed tasks (those with a populated AAR) are immutable. New tasks append at the next free integer; never letter-suffix, never re-slot existing tasks.
5. **`/splash [N] ["freeform"]`** — Input: opord-completed operation with at least one unchecked task. With `N`, ships TASK N. Without `N`, picks the next unchecked task from `TASKS.md`. Reads the task's Intent + Course of Action from OPERATION.md, implements code, runs format + typecheck, **adds the `#### After-Action Report` heading + body** to the target task section (or overwrites the body in place when shipping a revision splash), flips `- [ ]` → `- [x]` in TASKS.md, appends a TIMELINE.md bullet. Stops after one task.
6. **`/chop "freeform"`** — Input: infiled operation in warno or opord phase. Drafts a CHOP proposal at `notes/CHOP.md` showing how the parent OP's Warning Orders and EXECUTION tasks would split between the current OP and a new OP. **Does not touch the server, does not touch `OPERATION.md`**. Re-runnable: with `CHOP.md` already present, freeform args revise the existing proposal in place. Args are mandatory in both fresh and revision modes. Enters the **chop** phase; `/warno`, `/opord`, `/splash` may still run but each surfaces a "CHOP pending" `AskUserQuestion` gate first since they will desync the proposal.
7. **`/chopchop`** — Input: infiled operation with `notes/CHOP.md` present. Applies the proposal: spawns a new OP server-side seeded with the carved SITUATION + MISSION + EXECUTION (Course of Action and AAR carry over verbatim when present), prunes the same scope from the parent's local `OPERATION.md` + `TASKS.md`, and deletes `CHOP.md` both locally and server-side. Ends the chop phase. No args.
8. **`/nochop`** — Input: infiled operation with `notes/CHOP.md` present. Discards the proposal by deleting `CHOP.md` both locally and server-side. Parent OP is not modified. Ends the chop phase. No args.
9. **`/sitrep ["freeform"]`** — Input: local dir with progress. Output: server synced (tasks + all notes including `TIMELINE.md` and any in-flight `CHOP.md`), summary log posted. Does not close. Optional freeform args become extra context for the summary log.
10. **`/exfil ["close"|"don't close"]`** — Input: finished local dir. Output: server synced, summary log posted, optionally closes operation, deletes local dir.

**Read-only side branch — `/recon ["first question"]`**: Input: infiled operation. Loads `OPERATION.md` + `TIMELINE.md` and drops the session into a passive Q&A phase — answers questions about the OP and pulls extra files (`LOGS.yml`, other notes, codebase) on demand. Writes nothing — no `OPERATION.md` edits, no `TASKS.md` edits, no `add-timeline` bullets, no server syncs. Runnable from any post-`/infil` state without disturbing MISSION / EXECUTION / AAR content. Phase-changing skills (`/warno`, `/opord`, `/splash`, `/chop`, `/chopchop`, `/nochop`) and `/exfil` end the recon phase.

The canonical happy-path cycle: `/infil → /warno → /opord → /splash → (user reviews AAR) → /splash → … → /exfil`. Small fresh OPs may collapse `/warno → /opord` into a single `/raid` invocation. Mid-cycle revisions: `/opord "freeform"` between splashes adjusts the unfinished plan (insert, drop, split, rewrite); re-run `/warno` for direction (MISSION) changes.

**OP-splitting side branch**: when the scope inside one OP grows large enough that two OPs would be cleaner, run `/chop "freeform"` to draft the split into `notes/CHOP.md`, review (or hand-edit) the doc, then `/chopchop` to apply or `/nochop` to discard. Plugs in between any two cycle steps in the warno or opord phase.

## Infiled files

The infiled directory (`.naholo/local/infiled/`) is the agent's full working set for the active op. It holds CLI state, the checklist, the live OP document, the skill-event log, free-form notes, a server-log snapshot, and the 3-way-merge baseline. Files marked _fixed contract_ have a layout the skills depend on; everything else is either free-form or CLI-owned.

### `op.yml`

CLI state at the infiled root: `{ number, title }`. Written by `naholo agent infil` and refreshed by `naholo agent reinfil`. Agents do not edit it directly.

### `TASKS.md`

The canonical checklist. The only file with checkboxes. Flat — no sub-tasks. _Fixed contract._

- **Heading**: `# TASKS — OP #{n}`
- Every task is `- [ ] {n}. {short title}` (e.g., `- [ ] 1. Add man command`). No indentation, no sub-bullets.
- `[ref](naholo://tasks/{id})` links point at the server-side task record; sync commands append them inline when a new task lands on the server.

### `notes/OPERATION.md`

The single live document per OP. `/infil` writes SITUATION, `/warno` appends MISSION, `/opord` appends EXECUTION, `/splash` adds each task's AAR when it ships. _Fixed contract._ Layout:

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
  - `## EXECUTION` — per-task workspace. Appended by `/opord`. One `### TASK N — {title}` subsection per task, in order. The list is **flat** — no sub-tasks, no parent-child relationships. Each task section contains:
    - `#### Intent` — one or two sentences naming the success criterion `/splash` uses to know when the task is done. Not a re-narration of what's changing.
    - `#### Scheme of Maneuver` (optional) — ASCII diagram of the new flow, wireframe of the UI, or before/after signature diff. A numbered list is acceptable for trivially linear flows.
    - `#### Course of Action` — the atomic action list (Add / Edit / Move / Delete / Run / Manual). Sub-bullets list only top-level exported symbols, one-liner each. Sub-bullets are file-local annotations, not sub-tasks.
    - `#### After-Action Report` — added by `/splash` when the task ships (and overwritten in place on revision splashes). Its presence is the "shipped" signal. Format contract is owned by the splash skill.

- **No other top-level sections**: only the three above are allowed — do not invent new `##` headings. Timeline lives in TIMELINE.md. Per-task progress lives in EXECUTION's AARs.
- **Shipped signal**: the presence of `#### After-Action Report` under a task section means that task has shipped. Absence means it is still open.

### `notes/TIMELINE.md`

The chronological catch-up log. Its only purpose is to let a fresh agent session — one without in-context history of the OP — quickly understand what's already happened. Written exclusively by `naholo agent add-timeline`, which auto-seeds the heading on first write when the file is absent. _Fixed contract._ Each skill defines its own rules for when to call `add-timeline`; agents read this section once per session and don't need to re-read it during the session (everything new is already in context).

- **Heading**: `# TIMELINE — OP #{n}`
- Body is a single chronological bullet list. Format: `- {YYYY-MM-DD HH:MM} — {stage}: {summary}` (no bold markers).
- Stage labels: `infil`, `warno`, `raid`, `opord`, `splash`, `sitrep`, `exfil`, `chop`, `chopchop`, `nochop` — bare label, no parenthetical variants.

### `notes/*.md` — other notes

Free-form supporting docs (research, API design, decision logs, etc.). No fixed layout. `/warno` may write them while shaping MISSION; `/sitrep` and `/exfil` push them to the server alongside the workflow notes.

### `LOGS.yml`

Snapshot of the server-side log feed. Overwritten on every `naholo agent infil` / `pull` — never merged, never edited locally. Agents read it directly when they need server-log context.

### `.base/`

3-way-merge baseline owned by the sync commands (`naholo agent reinfil`, `naholo agent sitrep`, `naholo agent exfil`). Mirrors the last-synced state of `TASKS.md` and `notes/*.md`. Agents do not edit it.

### Listing order

When a skill prints a list of notes (infil summary, sitrep recap, etc.), the order is:

1. `OPERATION`
2. `TASKS`
3. `TIMELINE`
4. All other notes, sorted alphabetically.

## Commands

### `naholo agent infil <n>`

Initial fetch. Takes the server op number, creates `.naholo/local/infiled/`, writes `op.yml`, and pulls tasks/notes/.base/LOGS.yml. Errors with `Already infiled. Run "naholo agent exfil" first.` when an op is already infiled. Agents use this during `/infil`.

### `naholo agent reinfil`

Argless refresh-only. Reads the op number from `op.yml` and runs the 3-way merge against the server.

- 3-way merges notes line-by-line (via diff3) and structurally merges tasks by ID. Reports `updated`/`kept-local`/`merged`/`conflict`/`created`/`unchanged` per file.
- Refreshes `op.yml.title` from the server.
- Errors with `No infiled operation` when nothing is infiled. Switching ops requires `exfil` then `infil`. Never runs pushes.

### `naholo agent boot`

Argless. The single boot call every skill runs once per session. Prints three XML-delimited blocks to stdout:

- `<personality>…</personality>` — the active CLI profile's soul text (empty body when no soul is configured).
- `<manual>…</manual>` — the full text of this manual.
- `<op_status>…</op_status>` — YAML payload (`currentOp`, `opTitle`, `opPath`, `opNotes`) when an op is infiled, or the literal `No infiled operation.` body in the empty state.

Skills cache **only `opPath`** from `<op_status>` after the first boot — every other file path in the session composes on top of it. `currentOp`, `opTitle`, and `opNotes` are read inline when the boot fires and not stored.

### `naholo agent op`

Argless. Prints the op status YAML — same shape as `boot`'s `<op_status>` block:

```yaml
currentOp: 181
opTitle: compact skill booting
opPath: /abs/path/to/.naholo/local/infiled/
opNotes:
  - OPERATION
  - TIMELINE
```

Errors with bare `No infiled operation.` when `op.yml` is absent. Troubleshooting-only: an agent runs it when it has lost track of which op is infiled or wants to confirm op state without re-emitting the full `boot` payload. Skills don't call it in their normal flow.

### `naholo agent man`

Prints this manual to stdout. No arguments, no I/O.

### Troubleshooting: "No infiled operation" mid-session

The infiled directory is resolved against the shell's working directory — the CLI walks `process.cwd()` looking for `.naholo/local/infiled/`. If any `naholo agent *` command returns `No infiled operation` after it was working earlier in the session, the shell's cwd has likely drifted out of the directory where the op was infiled. Do not assume the op was exfiled or the directory deleted.

Recovery: run `pwd`, then `cd` back to the directory where the op was infiled (the one containing `.naholo/local/infiled/`), and re-run the command.

## Session bootstrap

Every skill (except `/infil`'s pre-CLI step) opens with two reads, each done once per session:

1. **Boot once** — if you haven't run `naholo agent boot` this session, run it now via the Bash tool. Adopt `<personality>` as your voice (skip if empty), adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>`. Read `currentOp` / `opTitle` inline for opening narration if needed; do not store them. If `<op_status>` carries `No infiled operation.`, abort the skill and tell the user to run `/infil <opNum>`. Otherwise skip the boot call on subsequent skill invocations — `opPath` is already cached.
2. **Load context once** — if you haven't read `OPERATION.md` this session, read `{opPath}notes/OPERATION.md`. If this is the first boot in a fresh session, also read `{opPath}notes/TIMELINE.md` once for catch-up. Do not re-read TIMELINE.md after that — it is a fresh-session catch-up doc, not in-session state.

Subsequent skill invocations in the same session reuse the cached `opPath` and the in-context OPERATION.md without re-running boot or re-reading the file. Skills that need a fresh `opNotes` / `opTitle` (e.g. after `/warno` retitles, after `/infil` lands `OPERATION` / `TIMELINE`) re-run `naholo agent op` on demand.

## Chat output

When printing an end-of-skill summary to the user (infil recap, warno summary, splash AAR digest, sitrep/exfil report), output raw markdown lines directly — **never wrap the summary block in a codeblock fence**. Fenced summaries break `[text](path)` link rendering in the Naholo UI. Files written to disk can still contain fenced code examples; this rule applies only to chat output.

### Link format

Summary links into `OPERATION.md` / `TIMELINE.md` use a **semantic label** and a **line-anchored URL** — the `#L<line>` lives in the URL only, never in the link label. The label is the noun the reader is opening: a top-level section (`MISSION`, `EXECUTION`), a task (`TASK 2`), a task's AAR (`TASK 1 - AAR`), or the file itself when there is no narrower target (`OPERATION.md`, `TIMELINE.md`). Resolve `<line>` by reading back the file the skill just wrote and locating the matching heading.

Rendered shapes:

- Section target: `[MISSION](/abs/path/notes/OPERATION.md#L13)`
- Task target: `[TASK 2](/abs/path/notes/OPERATION.md#L68)`
- AAR target: `[TASK 1 - AAR](/abs/path/notes/OPERATION.md#L61)`
- Whole-file target (no specific heading): `[OPERATION.md](/abs/path/notes/OPERATION.md)`
