---
name: recon
description: Plan an infiled Naholo operation — research the codebase, fill MISSION + EXECUTION in OPERATION.md, mirror OBJs into OBJECTIVES.md.
argument-hint: '["freeform FRAGO instructions"]'
---

# Recon — Define the Mission

Single-phase planning skill. Researches the codebase, fills `## MISSION` (Goal / Rationale / Prerequisites / Architecture Decisions) and `## EXECUTION` (one `### OBJ N — Title` per ORP) in `OPERATION.md`, and mirrors the OBJ list into `OBJECTIVES.md` as a flat checkbox list.

There is no rough/elaboration split. Each OBJ is sized for one reviewable `/splash`; sub-objectives are deliberately not used. The bar is "could a fresh `/splash` session ship one OBJ by reading only that OBJ's section in OPERATION.md and the project conventions?"

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op-list` (asks if multiple).

Anything passed as an argument is treated as **freeform instructions** describing how to revise OPERATION.md. There is no keyword list — read the instructions like any other prompt and classify the intent in step 6 (re-run dispatch). Common patterns:

- `/recon` (no args) — first run, or resume a partial draft.
- `/recon "rework architecture decisions about plan mode"` — targeted edit.
- `/recon "drop OBJ 7, add a new OBJ for the migration script"` — FRAGO mid-cycle.
- `/recon "rewrite the mission from scratch"` — full restart.

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

### 4. Prune unanswered open questions

In OPERATION.md, under `## SITUATION` → `### Open questions`, remove every `### {question}` block whose `Answer ->` line is empty or whitespace-only. Keep answered questions — their answers may be load-bearing context. If the entire `### Open questions` block becomes empty, remove the block heading too. Match with roughly `^### .+\n\s*Answer ->\s*$\n?` (multiline). When in doubt, leave the question in place.

### 5. Research the codebase

Investigate thoroughly to understand:

- Current architecture and patterns relevant to the operation
- Existing code that will be modified or extended
- Dependencies, prerequisites, schema fields, type signatures
- Conventions used in the project (from `CLAUDE.md` and existing code)

The goal is enough context to (a) write Architecture Decisions with real reasoning and (b) cut EXECUTION into ORP-sized chunks where each OBJ has known target files.

### 6. Re-run dispatch + write the plan

Inspect the current state of OPERATION.md MISSION + EXECUTION and any freeform args. Branch:

- **MISSION + EXECUTION both empty (or `_(empty …)_` placeholders), no args** → fresh write. Populate MISSION (Goal, Rationale, Prerequisites, Architecture Decisions) and EXECUTION (one `### OBJ N — Title` per ORP). Append `- **{YYYY-MM-DD HH:MM} — recon**: Drafted N OBJs.` to TIMELINE.md.
- **MISSION + EXECUTION partially populated, no args** → resume. Continue from where the previous run left off — add missing subsections, complete partial OBJs. Append `- **{YYYY-MM-DD HH:MM} — recon (resumed)**: …` to TIMELINE.md.
- **Args provided, classify intent**:
  - **Targeted edit** — args describe partial changes to MISSION (Goal, Rationale, Prerequisites, Architecture Decisions) or to specific unfinished OBJs. Apply the described edits in place. Append `- **{YYYY-MM-DD HH:MM} — recon (revised)**: {summary}` to TIMELINE.md.
  - **FRAGO** — args describe inserting new OBJs or removing/rewriting unfinished OBJs. Insert new `### OBJ N — Title` sections (renumber subsequent unfinished OBJs as needed). Mark removals by deleting the OBJ section entirely **only if the OBJ is unfinished**; never delete or rewrite an OBJ whose AAR is non-empty. Append `- **{YYYY-MM-DD HH:MM} — recon (FRAGO)**: {summary}` to TIMELINE.md.
  - **Full restart** — args explicitly say start over (e.g., "rewrite from scratch"). Replace MISSION + unfinished EXECUTION sections wholesale; preserve completed OBJs (those with non-empty AAR) at the top of EXECUTION. Append `- **{YYYY-MM-DD HH:MM} — recon (restart)**: {summary}` to TIMELINE.md.

### 7. Write OPERATION.md MISSION

`## MISSION` has exactly four subsections (in order):

- `### Goal` — what we will do. Free-form prose stating the change; bulleted lists are welcome where they help readability (e.g., when the goal enumerates several mechanical edits). This is the _only_ place Goal lives in OPERATION.md — `/infil` no longer seeds a SITUATION.Goal.
- `### Rationale` — how the goal resolves SITUATION.Pain. Connects each load-bearing piece of the goal back to the friction it removes; surfaces the ship-order reasoning when relevant.
- `### Prerequisites` — bullet list of things that must exist or be true before any OBJ can ship.
- `### Architecture Decisions` — numbered or bulleted entries, each with a short title and the **reasoning** behind the choice. This is where alternatives go ("considered B but chose A because…"). Decisions belong here, not inside individual OBJs.

### 8. Write OPERATION.md EXECUTION

One `### OBJ N — Title` subsection per OBJ, in order. Each OBJ section MUST contain:

- A goal paragraph (1–3 sentences) immediately under the heading. State the success criterion concretely — `/splash` uses this to decide when the OBJ is done.
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

- `#### Flow / UI` (optional but **required** when the OBJ introduces or modifies control flow, request lifecycle, or UI layout). An ASCII diagram so the reviewer can grasp the change at a glance:
  - **Control flow**: a box-and-arrow diagram (or a sequence-style listing) showing the order of operations and decision branches.
  - **UI**: a wireframe-style ASCII sketch showing the screen regions, key elements, and interactions.
  - **Linear / trivially simple flow**: a numbered list is acceptable instead of a diagram.

  Example (control flow, could be vertical or horizontal):

  ```
  request ── has session? ─┬─yes──► load user ──► handler
                           └─no───► 401
  ```

  Example (UI wireframe):

  ```
  ┌─────────────────────────────────────────────┐
  │ Header                          [user menu] │
  ├──────────┬──────────────────────────────────┤
  │ sidebar  │ main panel                       │
  │  · OBJs  │   ┌──────────────────────────┐   │
  │  · Notes │   │ OBJ 3 — title            │   │
  │  · Logs  │   │ goal …                   │   │
  │          │   │ [ Splash ] [ Edit ]      │   │
  │          │   └──────────────────────────┘   │
  └──────────┴──────────────────────────────────┘
  ```

  Skip this section entirely if the OBJ is a pure data/logic change with no flow or UI implications.

- `#### After-Action Report` — leave this heading present and the body empty. `/splash` fills it.

ORP sizing rules:

- Each OBJ should be a chunk a reviewer can read and understand in a few minutes after `/splash` ships it.
- No sub-objectives. If a chunk feels like it needs sub-bullets, split it into two top-level OBJs. (Per-change notes under `#### Target files` are not sub-objectives — they're file-local annotations.)
- OBJs are ordered for shipping — top-to-bottom is the default `/splash` order.
- A goal that says "do A or B" is a bug — pick one and explain the reasoning in Architecture Decisions.

### 9. Mirror to OBJECTIVES.md

Sync `OBJECTIVES.md` to match the EXECUTION OBJ list:

- Heading stays `# OBJECTIVES — OP #{n}`.
- One `- [ ] N. Title` line per `### OBJ N — Title`, in order. Flat — no indentation, no sub-bullets.
- Preserve existing `[ref](naholo://objectives/{id})` links and `[x]` done states for OBJs that are still present.
- Add new OBJs as `- [ ]`. Remove deleted OBJs (only if their AAR was empty — never remove a shipped OBJ).
- Renumber as needed; keep titles synced with the OBJ headings.

### 10. Print summary

Show the recon state. Use markdown link syntax. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

Recon complete for OP #42: "Implement user auth"

- Mission: Concept + Prerequisites + 4 Architecture Decisions
- Objectives: 6 total (0 done, 6 remaining)
- Researched:
  - [src/auth/](src/auth/)
  - [src/server/services/operator.ts](src/server/services/operator.ts)
- Operation: [OPERATION.md]({operationDir}/notes/OPERATION.md)
- Objectives: [OBJECTIVES.md]({operationDir}/OBJECTIVES.md)

Next:

- Looks good → run `/splash` to ship OBJ 1
- Changes needed → re-run `/recon "freeform instructions"` or edit OPERATION.md directly
- Optionally → `/sitrep` to push current plan to the server

## Rules

- **No sub-objectives**: every OBJ is flat. If you feel the urge to sub-bullet, split into two OBJs.
- **Completed OBJs are immutable**: an OBJ with a non-empty `#### After-Action Report` MUST NOT be edited, renumbered, or removed. New OBJs from FRAGO are appended after the last existing OBJ.
- **Decisions commit to one path**: every Architecture Decision and every OBJ goal names the chosen approach. "Pick A or B" phrasing is a bug — redraft.
- **Preserve `[ref]` links** in OBJECTIVES.md.
- **Respect existing done states**: don't uncheck `[x]` items in OBJECTIVES.md.
- **OPERATION.md has exactly three top-level sections**: SITUATION, MISSION, EXECUTION. No anything else. Open questions live under SITUATION; per-OBJ progress lives in EXECUTION's AARs; chronological events live in TIMELINE.md.
- **Do NOT implement any code** — only edit `OPERATION.md`, `OBJECTIVES.md`, and `TIMELINE.md`.
- Print the summary as raw markdown — no surrounding fence.
