---
name: plan
description: Cut a recon'd Naholo operation's MISSION into ORP-sized OBJs — write EXECUTION in OPERATION.md, mirror to OBJECTIVES.md.
argument-hint: '["freeform FRAGO instructions"]'
---

# Plan — Cut the Mission into OBJs

OPORD-style detail-cutter. Reads `## MISSION` (must already be populated by `/recon`), prunes unanswered open questions, cuts the mission into ORP-sized OBJs, writes `## EXECUTION` in `OPERATION.md`, and mirrors the OBJ list into `OBJECTIVES.md` as a flat checkbox list.

The skill name is the unambiguous "where are we" signal: re-running `/plan` is for plan adjustment (insert / remove / revise unfinished OBJs). Direction changes — Goal rewrites, Architecture Decision revisions, new Prerequisites — belong to `/recon`, not `/plan`.

Each OBJ is sized for one reviewable `/splash`; sub-objectives are deliberately not used. The bar is "could a fresh `/splash` session ship one OBJ by reading only that OBJ's section in OPERATION.md and the project conventions?"

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op-list` (asks if multiple).

Anything passed as an argument is treated as **freeform instructions** describing how to revise EXECUTION. There is no keyword list — read the instructions like any other prompt and classify the intent in step 5 (re-run dispatch). Common patterns:

- `/plan` (no args) — first run after `/recon`, or resume a partial EXECUTION draft.
- `/plan "drop OBJ 7, add a new OBJ for the migration script"` — FRAGO mid-cycle.
- `/plan "split OBJ 3 into two — one for the schema, one for the migration"` — targeted edit.
- `/plan "rewrite EXECUTION from scratch"` — full restart of unfinished OBJs.

MISSION-shaped instructions (Goal rewrite, AD changes, new Prerequisites) belong to `/recon`, not `/plan`.

## What to do

### 0. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 0.5. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

### 1. Find infiled operation

Run `naholo agent op-list`.

- If none exist → tell user to run `/infil {operationNumber}` first and abort.
- If multiple exist → show the list and ask user which one to use.

### 2. Resolve operation directory

Run `naholo agent op-path {operationNumber}` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it. If `{operationDir}` does not exist on disk, tell the user to run `/infil {operationNumber}` first and stop.

### 3. Read local state

Read:

- `{operationDir}/OBJECTIVES.md`
- `{operationDir}/notes/OPERATION.md`
- `{operationDir}/notes/TIMELINE.md`
- All other notes in `{operationDir}/notes/`

### 4. Validate MISSION

`## MISSION` must already be populated. If MISSION is empty, shows the `_(empty …)_` placeholder, or is missing any of the four required subsections (`### Goal`, `### Rationale`, `### Prerequisites`, `### Architecture Decisions`), stop and tell the user to run `/recon` first. `/plan` is the OPORD pass — without a WARNORD it has nothing to cut.

### 5. Prune unanswered open questions

Under `## SITUATION` → `### Open questions` (if present), remove every `### {question}` block whose `Answer ->` line is empty or whitespace-only. Keep answered questions — their answers may be load-bearing context that the OBJs reference. If the entire `### Open questions` block becomes empty, remove the block heading too. Match with roughly `^### .+\n\s*Answer ->\s*$\n?` (multiline). When in doubt, leave the question in place.

### 6. Re-run dispatch + write EXECUTION

Inspect the current state of `## EXECUTION` and any freeform args. Branch:

- **EXECUTION empty (or `_(empty …)_` placeholder), no args** → fresh write. Cut MISSION into ORP-sized OBJs and populate EXECUTION (one `### OBJ N — Title` per OBJ). Mirror to `OBJECTIVES.md` (step 8). Append `- **{YYYY-MM-DD HH:MM} — plan**: Drafted N OBJs.` to TIMELINE.md.
- **EXECUTION partially populated, no args** → resume. Continue from where the previous run left off — finish partial OBJs, fill missing subsections. Append `- **{YYYY-MM-DD HH:MM} — plan (resumed)**: …` to TIMELINE.md.
- **Args provided, classify intent**:
  - **Targeted edit** — args describe partial changes to specific unfinished OBJs (split, merge, retitle, swap target files). Apply the described edits in place. Append `- **{YYYY-MM-DD HH:MM} — plan (revised)**: {summary}` to TIMELINE.md.
  - **FRAGO** — args describe inserting new OBJs or removing/rewriting unfinished OBJs. Insert new `### OBJ N — Title` sections (renumber subsequent unfinished OBJs as needed). Mark removals by deleting the OBJ section entirely **only if the OBJ is unfinished**; never delete or rewrite an OBJ whose AAR is non-empty. Append `- **{YYYY-MM-DD HH:MM} — plan (FRAGO)**: {summary}` to TIMELINE.md.
  - **Full restart** — args explicitly say start over (e.g., "rewrite EXECUTION from scratch"). Replace unfinished OBJs wholesale; preserve completed OBJs (those with non-empty AAR) at the top of EXECUTION. Append `- **{YYYY-MM-DD HH:MM} — plan (restart)**: {summary}` to TIMELINE.md.

### 7. Write OPERATION.md EXECUTION

One `### OBJ N — Title` subsection per OBJ, in order. Each OBJ section MUST contain:

- A goal paragraph (1–3 sentences) immediately under the heading. State the success criterion concretely — `/splash` uses this to decide when the OBJ is done.
- `#### Scheme of Maneuver` (optional but **required** when the OBJ introduces or modifies control flow, request lifecycle, or UI layout). An ASCII diagram so the reviewer can grasp the change at a glance:
  - **Control flow**: a box-and-arrow diagram (or a sequence-style listing) showing the order of operations and decision branches.
  - **UI**: a wireframe-style ASCII sketch showing the screen regions, key elements, and interactions.
  - **Linear / trivially simple flow**: a numbered list is acceptable instead of a diagram.

  Example (control flow):

  ```
  request ── has session? ─┬─yes──► load user ──► handler
                           └─no───► 401
  ```

  Skip this section entirely if the OBJ is a pure data/logic change with no flow or UI implications.

- `#### Target files` — bullet list of files to create or modify, with a nested sub-list of per-symbol or per-change notes underneath each file. Format:

  ```
  - {path}
    - `symbolOrSection`: brief description of the change. Can span more than one sentence if needed, but stay terse.
    - another change in the same file.
  ```

  Example:

  ```
  - src/server/services/operator.ts
    - `createOperator()`: add `loadoutId` arg; default to active loadout when omitted.
    - `upsertOperator()`: delete — replaced by `createOperator` + new `updateOperator`.
  - src/components/operations/operation-page.tsx
    - thread the new `loadoutId` through props; no UI change.
  ```

  Include all files you can predict; `/splash` may add files in its AAR if it discovers more. Per-change notes are NOT sub-objectives — they're file-local annotations to scope the splash work.

- `#### After-Action Report` — leave this heading present and the body empty. `/splash` fills it.

ORP sizing rules:

- Each OBJ should be a chunk a reviewer can read and understand in a few minutes after `/splash` ships it.
- No sub-objectives. If a chunk feels like it needs sub-bullets, split it into two top-level OBJs. (Per-change notes under `#### Target files` are not sub-objectives — they're file-local annotations.)
- OBJs are ordered for shipping — top-to-bottom is the default `/splash` order.
- A goal that says "do A or B" is a bug — pick one and explain the reasoning in MISSION's Architecture Decisions (or ask `/recon` to add the decision if it's missing).

### 8. Mirror to OBJECTIVES.md

Sync `OBJECTIVES.md` to match the EXECUTION OBJ list:

- Heading stays `# OBJECTIVES — OP #{n}`.
- One `- [ ] N. Title` line per `### OBJ N — Title`, in order. Flat — no indentation, no sub-bullets.
- Preserve existing `[ref](naholo://objectives/{id})` links and `[x]` done states for OBJs that are still present.
- Add new OBJs as `- [ ]`. Remove deleted OBJs (only if their AAR was empty — never remove a shipped OBJ).
- Renumber as needed; keep titles synced with the OBJ headings.

### 9. Print summary

Show the plan state. Use markdown link syntax. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

Plan complete for OP #42: "Implement user auth"

- Objectives: 6 total (0 done, 6 remaining)
- Operation: [OPERATION.md]({operationDir}/notes/OPERATION.md)
- Objectives: [OBJECTIVES.md]({operationDir}/OBJECTIVES.md)

Next:

- Looks good → run `/splash` to ship OBJ 1
- Plan adjustment → re-run `/plan "freeform instructions"` or edit EXECUTION directly
- Direction change → re-run `/recon "freeform instructions"` to revise MISSION
- Optionally → `/sitrep` to push current plan to the server

## Rules

- **EXECUTION-only**: `/plan` writes (or revises) `## EXECUTION` and mirrors to `OBJECTIVES.md`. It does NOT touch `## MISSION` — direction changes belong to `/recon`.
- **MISSION must exist**: abort with a "run `/recon` first" message if MISSION is empty or partial.
- **No sub-objectives**: every OBJ is flat. If you feel the urge to sub-bullet, split into two OBJs.
- **Completed OBJs are immutable**: an OBJ with a non-empty `#### After-Action Report` MUST NOT be edited, renumbered, or removed. New OBJs from FRAGO are appended after the last existing OBJ.
- **Decisions commit to one path**: every OBJ goal names the chosen approach. "Pick A or B" phrasing is a bug — redraft, or ask `/recon` to add the missing Architecture Decision.
- **Preserve `[ref]` links** in OBJECTIVES.md.
- **Respect existing done states**: don't uncheck `[x]` items in OBJECTIVES.md.
- **OPERATION.md has exactly three top-level sections**: SITUATION, MISSION, EXECUTION. No anything else. Open questions live under SITUATION; per-OBJ progress lives in EXECUTION's AARs; chronological events live in TIMELINE.md.
- **Do NOT implement any code** — only edit `OPERATION.md`, `OBJECTIVES.md`, and `TIMELINE.md`.
- Print the summary as raw markdown — no surrounding fence.
