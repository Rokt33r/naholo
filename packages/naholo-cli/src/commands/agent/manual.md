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

Operational vocabulary used by the skills:

- **ORP** — Operation Rally Point. The unit of work for a single OBJ: scoped, reviewable, ships in one `/splash`.
- **AAR** — After-Action Report. The on-disk record of what actually happened during a `/splash`. Lives inside each OBJ's section.
- **FRAGO** — Fragmentary Order. Mid-cycle changes to remaining (unfinished) OBJs via re-running `/recon` with freeform instructions.

## Workflow

The agent-facing lifecycle for an operation is a one-way pipeline from server to local, then back:

1. **`/infil {n}`** — Input: operation number on server. `naholo agent pull {n}` creates the local operation directory, pulls `OBJECTIVES.md` and all existing `notes/*.md` (plus `.base/` copies), and prints the absolute directory path to stdout — read it from there; do not run `op-path` during `/infil`. The agent then generates the workflow notes if missing: `notes/OPERATION.md` (with `## SITUATION` filled from logs/notes; `## MISSION` and `## EXECUTION` left as empty section headers) and `notes/TIMELINE.md` (one bullet per existing log entry). `OBJECTIVES.md` stays as pulled (empty list, ready for `/recon`). Never pushes.
2. **`/recon ["freeform"]`** — Input: infiled operation. Researches the codebase, fills `## MISSION` (Goal / Rationale / Prerequisites / Architecture Decisions) and `## EXECUTION` (one `### OBJ N — Title` per ORP-sized objective with goal + Target files; AAR empty). Mirrors EXECUTION OBJs into `OBJECTIVES.md` as a flat checkbox list. Prunes unanswered open questions. Resumable — re-running picks up where the previous run left off. Freeform args are FRAGO instructions: edit unfinished OBJs only; never touch completed OBJs (those with non-empty AAR).
3. **`/splash [N] ["freeform"]`** — Input: recon-completed operation with at least one unchecked OBJ. With `N`, ships OBJ N. Without `N`, picks the next unchecked OBJ from `OBJECTIVES.md`. Reads the OBJ's goal + Target files from OPERATION.md, implements code, runs format + typecheck, writes the AAR into the same `### OBJ N` section, flips `- [ ]` → `- [x]` in OBJECTIVES.md, appends a TIMELINE.md bullet. Stops after one OBJ. Re-running on a shipped OBJ updates the AAR in place.
4. **`/sitrep ["freeform"]`** — Input: local dir with progress. Output: server synced (objectives + all notes including TIMELINE.md), summary log posted. Does not close. Optional freeform args become extra context for the summary log.
5. **`/exfil ["close"|"don't close"]`** — Input: finished local dir. Output: server synced, summary log posted, optionally closes operation, deletes local dir.

The canonical happy-path cycle: `/infil → /recon → /splash → (user reviews AAR) → /splash → … → /exfil`. FRAGO loop: `/recon "freeform"` between splashes inserts or revises unfinished OBJs.

## Notes

Three workflow notes have a fixed contract. All other notes are free-form.

### OPERATION.md

The single live document per OP. Replaces the old four-section format and the separate SPEC.md. Written by `/infil`, filled by `/recon`, AAR-updated by `/splash`. Layout:

- **Heading**: `# OP #{n}: {title}`
- **Allowed sections (exactly these three, in this order)**:
  - `## SITUATION` — context. Subsections (in fixed order): `### Pain` (mandatory — always present), `### Suggested solution` (optional — emit only when logs/notes hint at one; no `N/A` filler), `### Notes` (optional — brief bullet list of supplementary info that doesn't fit Pain or Suggested solution; one-line summaries pointing at `notes/*.md` or `LOGS.yml` for detail; omit the heading entirely when there are no bullets). `/infil` writes Pain from logs/notes; if Pain is missing, marks with `_Agent-generated assumption:_` or asks the user. Goal is **not** part of SITUATION — it lives under MISSION and is written during `/recon`. Open questions are **not** seeded by `/infil`; they are a transient `/recon`-owned block (`### Open questions` with one `### {question}` per question, followed by `Answer ->` on the next line) that `/recon` may add during research and that gets pruned later.
  - `## MISSION` — plan. Subsections (in order): `### Goal` (what we will do — free-form prose, lists welcome), `### Rationale` (how the goal resolves SITUATION.Pain), `### Prerequisites`, `### Architecture Decisions`. Written by `/recon`.
  - `## EXECUTION` — per-OBJ workspace. One `### OBJ N — {title}` subsection per objective, in order. Each OBJ section contains:
    - A short goal paragraph (1–3 sentences) immediately under the heading. This is the success criterion `/splash` uses to know when the OBJ is done.
    - `#### Target files` — bullet list of files, each with a nested sub-list of per-symbol / per-change notes (terse, may span more than one sentence if needed). Per-change notes are file-local annotations, not sub-objectives.
    - `#### Flow / UI` (optional, **required when the OBJ introduces or modifies control flow or UI**) — ASCII diagram of the new flow or wireframe of the UI. A numbered list is acceptable for trivially linear flows.
    - `#### After-Action Report` — initially empty. Filled by `/splash` after the OBJ ships. Updated in place if the OBJ is re-shipped or revised. Records what actually happened, deviations from plan, key files touched.

- **No other top-level sections**: only the three above are allowed — do not invent new `##` headings. Open questions, when present, live under SITUATION as a transient `/recon`-owned subsection. Timeline lives in TIMELINE.md. Per-OBJ progress lives in EXECUTION's AARs.
- **Completed-OBJ rule**: an OBJ with a non-empty AAR is immutable to `/recon`. FRAGO inserts new `### OBJ N` sections (after the last existing OBJ, renumbered as needed) rather than rewriting completed OBJs.

### OBJECTIVES.md

The canonical checklist. The only file with checkboxes. Flat — no sub-objectives.

- **Heading**: `# OBJECTIVES — OP #{n}`
- Every OBJ is `- [ ] {n}. {short title}` (e.g., `- [ ] 1. Add man command`). No indentation, no sub-bullets.
- `[ref](naholo://objectives/{id})` links are appended by `naholo agent push` for newly created objectives — preserve them.
- Checkboxes flip `[ ]` → `[x]` only; never uncheck.
- `/splash` flips the box for OBJ N immediately after the OBJ is shipped.

### TIMELINE.md

The chronological event log. Separate note (was previously `## Timeline` inside OPERATION.md).

- **Heading**: `# TIMELINE — OP #{n}`
- Body is a single chronological bullet list. Format: `- **{YYYY-MM-DD HH:MM} — {stage-or-author}**: {summary}`.
- `/infil` seeds it with one bullet per existing server log entry.
- `/recon`, `/splash`, `/sitrep`, `/exfil` each append their own bullets here. Stage labels: `recon`, `splash`, `sitrep`, `exfil`.
- Pushed to the server as just-another-note by `/sitrep` and `/exfil`.

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
