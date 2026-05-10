# Naholo Agent Manual

This is the single source of truth for how AI agents work with Naholo operations. Skills (`/infil`, `/recon`, `/splash`, `/sitrep`, `/exfil`) reference this manual instead of re-explaining workflow and file formats.

## Terminology

| Entity    | Acronym | Familiar Term  | Familiar Context                  |
| --------- | ------- | -------------- | --------------------------------- |
| Operation | OP      | issue          | GitHub Issues                     |
| Objective | OBJ     | task           | tasks within an issue             |
| Operator  | OPR     | project member | GitHub / general PM               |
| Campaign  | —       | milestone/epic | GitHub Milestones / PM tool epics |

Users may refer to entities by any column — entity name, acronym, or familiar term. For example, "task 1" means objective 1; "issue #42" means operation #42. Resolve all aliases.

Operational vocabulary used by the skills(Written in full in docs; may be abbreviated in agent chat.):

- **ORP** — Operation Rally Point. The unit of work for a single OBJ: scoped, reviewable, ships in one `/splash`.
- **AAR** — After-Action Report. The on-disk record of what actually happened during a `/splash`. Lives inside each OBJ's section.
- **CONOPS** — Concept of Operations. The two-or-three-sentence overview that opens MISSION: names the chosen approach and ties it back to `SITUATION.Pain`. Concept-level only — file lists and edit steps belong in Warning Orders, not here.
- **WARNORD** — Warning Order. One bulleted decision inside MISSION's `### Warning Orders` subsection — one sentence per decision.
- **OPORD** — Operation Order. The detail-cutting brief: the MISSION broken into ordered, ship-sized tasks, each with a Course of Action. `/objs` writes the OPORD into `## EXECUTION` (one `### OBJ N — Title` per ORP) and mirrors the OBJ list to `OBJECTIVES.md`.
- **COA** — Course of Action. the per-OBJ action list inside EXECUTION. Each item names an explicit step (Add / Edit / Delete / Run / Manual) so non-file work (migrations, rebuilds) is first-class. `Manual:` items are user-owned — `/splash` pauses for the user instead of executing them. Sub-bullets list only top-level exported symbols.
- **FRAGO** — Fragmentary Order. Mid-cycle changes to remaining (unfinished) OBJs via re-running `/objs` with freeform instructions.

## Workflow

The agent-facing lifecycle for an operation is a one-way pipeline from server to local, then back:

1. **`/infil {n}`** — Input: operation number on server. `naholo agent pull {n}` creates the local operation directory, pulls `OBJECTIVES.md` and all existing `notes/*.md` (plus `.base/` copies), and prints the absolute directory path to stdout — read it from there; do not run `op-path` during `/infil`. The agent then generates the workflow notes if missing: `notes/OPERATION.md` (containing **only** `## SITUATION`, filled from logs/notes — `## MISSION` and `## EXECUTION` are absent and will be appended by their owning skills) and `notes/TIMELINE.md` (one bullet per existing log entry). `OBJECTIVES.md` stays as pulled (empty list, ready for `/recon`). Never pushes.
2. **`/recon ["freeform"]`** — Input: infiled operation. The MISSION-writing skill. Researches the codebase and **appends `## MISSION`** (heading + Concept of Operations / Prerequisites / Warning Orders) to `OPERATION.md` when MISSION is absent; revises in place when it already exists. Does NOT touch `## EXECUTION` or `OBJECTIVES.md` — those are `/objs`'s job. Resumable — re-running picks up where the previous run left off. Freeform args are MISSION-scoped (revise Concept of Operations, swap Warning Orders, etc.); EXECUTION-shaped instructions belong to `/objs`. Stops with a "next: `/objs`" pointer.
3. **`/objs ["freeform"]`** — Input: recon-completed operation (MISSION populated). OPORD-style detail-cutter. Resolves any unanswered Warning Order alternatives, cuts MISSION into ORP-sized OBJs, **appends `## EXECUTION`** (one `### OBJ N — Title` per OBJ with `#### Goal` + `#### Scheme of Maneuver` when applicable + `#### Course of Action`; **no `#### After-Action Report` heading** — `/splash` adds that when it ships the OBJ), and mirrors the OBJ list into `OBJECTIVES.md` as a flat checkbox list. Re-runs handle EXECUTION FRAGOs: edit unfinished OBJs only; never touch completed OBJs (those with a populated AAR).
4. **`/splash [N] ["freeform"]`** — Input: objs-completed operation with at least one unchecked OBJ. With `N`, ships OBJ N. Without `N`, picks the next unchecked OBJ from `OBJECTIVES.md`. Reads the OBJ's Goal + Course of Action from OPERATION.md, implements code, runs format + typecheck, **adds the `#### After-Action Report` heading + body** to the target OBJ section (or overwrites the body in place when shipping a revision splash), flips `- [ ]` → `- [x]` in OBJECTIVES.md, appends a TIMELINE.md bullet. Stops after one OBJ.
5. **`/sitrep ["freeform"]`** — Input: local dir with progress. Output: server synced (objectives + all notes including TIMELINE.md), summary log posted. Does not close. Optional freeform args become extra context for the summary log.
6. **`/exfil ["close"|"don't close"]`** — Input: finished local dir. Output: server synced, summary log posted, optionally closes operation, deletes local dir.

The canonical happy-path cycle: `/infil → /recon → /objs → /splash → (user reviews AAR) → /splash → … → /exfil`. FRAGO loop: `/objs "freeform"` between splashes inserts or revises unfinished OBJs; re-run `/recon` for direction (MISSION) changes.

## Notes

Three workflow notes have a fixed contract. All other notes are free-form.

### OPERATION.md

The single live document per OP. `/infil` writes SITUATION, `/recon` appends MISSION, `/objs` appends EXECUTION, `/splash` adds each OBJ's AAR when it ships. Layout:

- **Heading**: `# OP #{n}: {title}`
- **Sections (in fixed order when present; only `## SITUATION` is mandatory)**: top-level sections appear only when their owning skill has written them. After `/infil` only `## SITUATION` exists; `## MISSION` is appended by `/recon`; `## EXECUTION` is appended by `/objs`. No empty section headers, no placeholder bodies — if a section is absent, the skill that owns it hasn't run yet.
  - `## SITUATION` — context. Subsections:
    - `### Pain` — the problem statement.
    - `### Suggested solution` — first-pass idea; may be absent.
    - `### Notes` — supplementary one-line bullets pointing at `notes/*.md` or `LOGS.yml`; may be absent.
  - `## MISSION` — plan. Appended by `/recon`. Three subsections (in order):
    - `### Concept of Operations` — two-or-three-sentence overview.
    - `### Prerequisites` — bullet list.
    - `### Warning Orders` — flat bullet list, one decision per bullet, one sentence each. Two optional sub-bullet forms under a decision: `- ? <prompt> (a / b) >` (transient open alt resolved by `/objs`) and `- Rejected: a, b` (alternatives that were considered and dismissed).
  - `## EXECUTION` — per-OBJ workspace. Appended by `/objs`. One `### OBJ N — {title}` subsection per objective, in order. Each OBJ section contains:
    - `#### Goal` — one or two sentences naming the success criterion `/splash` uses to know when the OBJ is done. Not a re-narration of what's changing.
    - `#### Scheme of Maneuver` (optional) — ASCII diagram of the new flow, wireframe of the UI, or before/after signature diff. A numbered list is acceptable for trivially linear flows.
    - `#### Course of Action` — the atomic action list (Add / Edit / Delete / Run / Manual). Sub-bullets list only top-level exported symbols, one-liner each. Sub-bullets are file-local annotations, not sub-objectives.
    - `#### After-Action Report` — added by `/splash` when the OBJ ships (and overwritten in place on revision splashes). Its presence is the "shipped" signal. Format contract is owned by the splash skill.

- **No other top-level sections**: only the three above are allowed — do not invent new `##` headings. Timeline lives in TIMELINE.md. Per-OBJ progress lives in EXECUTION's AARs.
- **Shipped signal**: the presence of `#### After-Action Report` under an OBJ section means that OBJ has shipped. Absence means it is still open.

### OBJECTIVES.md

The canonical checklist. The only file with checkboxes. Flat — no sub-objectives.

- **Heading**: `# OBJECTIVES — OP #{n}`
- Every OBJ is `- [ ] {n}. {short title}` (e.g., `- [ ] 1. Add man command`). No indentation, no sub-bullets.
- `[ref](naholo://objectives/{id})` links point at the server-side objective record; `naholo agent push` appends them for newly created objectives.

### TIMELINE.md

The chronological event log. Separate note (was previously `## Timeline` inside OPERATION.md).

- **Heading**: `# TIMELINE — OP #{n}`
- Body is a single chronological bullet list. Format: `- **{YYYY-MM-DD HH:MM} — {stage-or-author}**: {summary}`.
- Stage labels used by skills: `recon`, `objs`, `splash`, `sitrep`, `exfil`. Other authors (server log entries seeded at infil) appear by name.

### Listing order

When a skill prints a list of notes (infil summary, sitrep recap, etc.), the order is:

1. `OPERATION`
2. `OBJECTIVES`
3. `TIMELINE`
4. All other notes, sorted alphabetically.

## Commands

### `naholo agent pull <n>`

Fetches the operation from the server and materializes it on disk.

- Fresh run: creates the local operation directory, writes `OBJECTIVES.md`, `notes/*.md`, and `.base/` copies from server state.
- Re-run: 3-way merges notes line-by-line (via diff3) and structurally merges objectives by ID. Reports `updated`/`kept-local`/`merged`/`conflict`/`created`/`unchanged` per file.
- Outputs a human-readable report with counts and a final `Local: <absolute-path>/` line. Read stdout to know what happened and to pick up the directory path — `/infil` agents use this instead of running `op-path` separately.
- Agents use this during `/infil`. Never runs pushes.

### `naholo agent push <n>`

Pushes local changes to the server.

- Reads `OBJECTIVES.md` and syncs the objective tree (creates new objectives, updates existing by `[ref]` id).
- Patches newly created objectives with `[ref](naholo://objectives/{id})` links in the local file.
- Reads every `notes/*.md` (including `TIMELINE.md`) and creates or updates the corresponding server note.
- Updates `.base/` with the just-pushed state as the new baseline for future 3-way merges.
- Outputs sync counts. Agents use this during `/sitrep` and `/exfil`.

### `naholo agent op-path <n>`

Prints the absolute local directory for operation `<n>`. Skills resolve the operation directory through this command — never hardcode `.naholo/local/operations/...` paths.

### `naholo agent man`

Prints this manual to stdout. No arguments, no I/O. Skills run it once per session (mirroring the `naholo://soul` pattern) and adopt the rules.

## Chat output

When printing an end-of-skill summary to the user (infil recap, recon summary, splash AAR digest, sitrep/exfil report), output raw markdown lines directly — **never wrap the summary block in a codeblock fence**. Fenced summaries break `[text](path)` link rendering in the Naholo UI. Files written to disk can still contain fenced code examples; this rule applies only to chat output.
