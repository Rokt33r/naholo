---
name: objs
description: Cut a recon'd Naholo operation's MISSION into ORP-sized OBJs — write EXECUTION in OPERATION.md, mirror to OBJECTIVES.md.
argument-hint: '["freeform FRAGO instructions"]'
---

# Objs — Cut the Mission into OBJs

OPORD-style detail-cutter. Reads `## MISSION` (must already be populated by `/recon`), resolves any unanswered Warning Order alternatives, cuts the mission into ORP-sized OBJs, **appends `## EXECUTION`** to `OPERATION.md` when absent (revises in place when present), and mirrors the OBJ list into `OBJECTIVES.md` as a flat checkbox list.

The skill name is the unambiguous "where are we" signal: re-running `/objs` is for plan adjustment (insert / remove / revise unfinished OBJs). Direction changes — Concept of Operations rewrites, Warning Order revisions, new Prerequisites — belong to `/recon`, not `/objs`.

Each OBJ is sized for one reviewable `/splash`; sub-objectives are deliberately not used. The bar is "could a fresh `/splash` session ship one OBJ by reading only that OBJ's section in OPERATION.md and the project conventions?"

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`.

Anything passed as an argument is treated as **freeform instructions** describing how to revise EXECUTION. There is no keyword list — read the instructions like any other prompt and classify the intent in step 8 (re-run dispatch). Common patterns:

- `/objs` (no args) — first run after `/recon`, or resume a partial EXECUTION draft.
- `/objs "drop OBJ 7, add a new OBJ for the migration script"` — FRAGO mid-cycle.
- `/objs "split OBJ 3 into two — one for the schema, one for the migration"` — targeted edit.
- `/objs "rewrite EXECUTION from scratch"` — full restart of unfinished OBJs.

MISSION-shaped instructions (Concept of Operations rewrite, Warning Order changes, new Prerequisites) belong to `/recon`, not `/objs`.

## What to do

### 1. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 2. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

### 3. Find infiled operation

Run `naholo agent op`. If it errors with "No infiled operation", tell the user to run `/infil {operationNumber}` first and abort. Otherwise capture the printed `#{operationNumber} {title}` for context.

### 4. Resolve operation directory

Run `naholo agent op-path` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it.

### 5. Read local state

Read if you haven't read:

- `{operationDir}/OBJECTIVES.md`
- `{operationDir}/notes/OPERATION.md`
- `{operationDir}/notes/TIMELINE.md`

If MISSION includes a `### Target Reference Points` subsection, treat it as the canonical map of what `/recon` already researched. In a fresh session, prefer reading those listed paths over re-walking the codebase from scratch — TRP exists precisely so `/objs` doesn't redo the discovery work.

### 6. Validate MISSION

`## MISSION` must already be populated. If MISSION is absent (no `## MISSION` heading) or missing any of the three required subsections (`### Concept of Operations`, `### Prerequisites`, `### Warning Orders`), stop and tell the user to run `/recon` first. `/objs` is the OPORD pass — without a populated MISSION it has nothing to cut.

`### Target Reference Points` is optional — its absence is not a validation failure. If it's missing, `/objs` proceeds normally (and may have to research the codebase itself).

### 7. Resolve Warning Order alternatives

For each `### Warning Orders` bullet that has a `- ? <prompt> (opt-a / opt-b) >` sub-bullet, resolve it in place:

- **No answer written** (nothing after the trailing `>`) → replace the `- ? ...` sub-bullet with `- Rejected: opt-a, opt-b`. The bold-label chosen path stays as-is. If a `- Rejected:` already exists on the WO, merge into it (comma-join).
- **User wrote an answer matching one of the listed options** → rewrite the WO's bold label to commit to that option, then replace the sub-bullet with `- Rejected: <original chosen + remaining alts>`.
- **User wrote a free-form answer** (something not in the listed options) → rewrite the bold label to that answer, replace the sub-bullet with `- Rejected: opt-a, opt-b`.

No reasons on rejected items unless the user wrote them in. When in doubt, treat the answer as empty and collapse to Rejected.

### 8. Re-run dispatch + write EXECUTION

Inspect the current state of `## EXECUTION` and any freeform args. Branch:

- **EXECUTION absent (no `## EXECUTION` heading), no args** → fresh write. Append `## EXECUTION` after the last MISSION content, then cut MISSION into ORP-sized OBJs and populate EXECUTION (one `### OBJ N — Title` per OBJ). Mirror to `OBJECTIVES.md` (step 10). Append `- **{YYYY-MM-DD HH:MM} — objs**: Drafted N OBJs.` to TIMELINE.md.
- **EXECUTION present but partially populated, no args** → resume in place. Continue from where the previous run left off — finish partial OBJs, fill missing subsections. Append `- **{YYYY-MM-DD HH:MM} — plan (resumed)**: …` to TIMELINE.md.
- **Args provided, classify intent**:
  - **Targeted edit** — args describe partial changes to specific unfinished OBJs (split, merge, retitle, swap Course of Action steps). Apply the described edits in place. Append `- **{YYYY-MM-DD HH:MM} — plan (revised)**: {summary}` to TIMELINE.md.
  - **FRAGO** — args describe inserting new OBJs or removing/rewriting unfinished OBJs. Insert new `### OBJ N — Title` sections (renumber subsequent unfinished OBJs as needed). Mark removals by deleting the OBJ section entirely **only if the OBJ is unfinished** (no `#### After-Action Report` heading); never delete or rewrite an OBJ whose AAR heading is present. Append `- **{YYYY-MM-DD HH:MM} — plan (FRAGO)**: {summary}` to TIMELINE.md.
  - **Full restart** — args explicitly say start over (e.g., "rewrite EXECUTION from scratch"). Confirm with AskQuestionTool that the user really want this. If they do, rewrite EXECUTION and renew all OBJs even finished. Append `- **{YYYY-MM-DD HH:MM} — plan (restart)**: {summary}` to TIMELINE.md.

### 9. Write OPERATION.md EXECUTION

One `### OBJ N — Title` subsection per OBJ, in order. Each OBJ section has three subsections — **`#### Goal`**, **`#### Scheme of Maneuver`** (optional), and **`#### Course of Action`** — in that order.

- `#### Goal` — one or two sentences stating the success criterion concretely. This is the bar `/splash` uses to decide when the OBJ is done. Name observable end states (a command prints X, `tsc` is green, file Y exists, etc.). Don't restate what's changing — that's Course of Action's job. No "atomic flip of …" framing, no scope boundaries, no rationale.

- `#### Scheme of Maneuver` (optional, but **required** when the OBJ introduces or modifies control flow, request lifecycle, UI layout, or symbol/path signatures). Use code-fenced ASCII for visual artifacts:
  - **Control flow**: a box-and-arrow diagram (or a sequence-style listing) showing the order of operations and decision branches.
  - **UI**: a wireframe-style ASCII sketch showing the screen regions, key elements, and interactions.
  - **Signature changes / before-after layouts**: a fenced block with arrows showing the diff.
  - **Linear / trivially simple flow**: a numbered list is acceptable instead of a diagram.

  Example (control flow):

  ```
  request ── has session? ─┬─yes──► load user ──► handler
                           └─no───► 401
  ```

  Example (signature diff):

  ```
  helper signatures in local-operations.ts:
    getLocalOperationDir(opNum)  →  getLocalOperationDir()
    getNotesDir(opNum)           →  getNotesDir()
    + readOpYml() / writeOpYml({ number, title })
  ```

  Skip this section entirely if the OBJ is a pure data/logic change with no flow, UI, or signature implications.

- `#### Course of Action` — the atomic steps that ship this OBJ. Each item is one of six verbs:
  - `Add {path}` — one-line purpose
  - `Edit {path}` — one-line description of what changes
  - `Move {oldPath} → {newPath}` — one-line description (e.g. "rename for clarity", "relocate into shared lib"). Use `→` (Unicode arrow). Sub-bullets only when symbols' signatures change as part of the move; pure relocations get no sub-bullets.
  - `Delete {path}` — one-line reason
  - `` Run `{command}` `` — one-line purpose (migrations, rebuilds, etc.)
  - `Manual: {action}` — one-line description of what the user must do (verify in browser, run a command the agent must not run, paste a secret, etc.). `/splash` pauses on these and asks the user to confirm completion before continuing.

  Sub-bullets (only under `Add` / `Edit` / `Move`) name **top-level exported symbols**, one-liner per sub-bullet. List every changed export, even when the file exports a single thing (e.g. a Commander subcommand module). Do NOT list internal helpers, private functions, or per-line code descriptions. Omit sub-bullets entirely on `Delete` / `Run` / `Manual`, on `Edit` items where no exported symbol is meaningfully changed (e.g. a registration-only edit), and on `Move` items that are pure relocations.

  Example:

  ```
  - Edit packages/naholo-cli/src/lib/local-operations.ts
    - `getLocalOperationDir`, `getNotesDir`, `getBaseDir`, `getObjectivesPath`,
      `getBaseObjectivesPath`, `getBaseNotesDir`: drop the `operationNumber` arg
    - `readOpYml`, `writeOpYml`: new — read/write `op.yml` at the infiled root
  - Add packages/naholo-cli/src/commands/agent/infil.ts
    - `infil` subcommand: writes op.yml and pulls data
  - Move packages/naholo-cli/src/lib/local-operations.ts → packages/naholo-cli/src/lib/infiled.ts — rename now that "operations" plural is gone
  - Delete packages/naholo-cli/src/commands/agent/op-list.ts — superseded by `op`
  - Run `mv .naholo/local/operations/122 .naholo/local/infiled` — migrate this op's data
  - Manual: run `pnpm db:migrate` after the schema edit lands (CLAUDE.md forbids the agent from running it)
  ```

  Include all steps you can predict; `/splash` may add files in its AAR if it discovers more.

`/objs`'s per-OBJ template ends at `#### Course of Action`. Do **not** write a `#### After-Action Report` heading or body — `/splash` adds the heading + body when it ships the OBJ.

ORP sizing rules:

- Each OBJ should be a chunk a reviewer can read and understand in a few minutes after `/splash` ships it.
- **Goal is the success criterion only.** Don't restate what's changing — that's Course of Action's job.
- No sub-objectives. If a chunk feels like it needs sub-bullets, split it into two top-level OBJs. (Course of Action sub-bullets are not sub-objectives — they're per-symbol annotations on a single step.)
- OBJs are ordered for shipping — top-to-bottom is the default `/splash` order.
- A goal that says "do A or B" is a bug — pick one and explain the reasoning in MISSION's Warning Orders (or ask `/recon` to add the decision if it's missing).

### 10. Mirror to OBJECTIVES.md

Sync `OBJECTIVES.md` to match the EXECUTION OBJ list:

- Heading stays `# OBJECTIVES — OP #{n}`.
- One `- [ ] N. Title` line per `### OBJ N — Title`, in order. Flat — no indentation, no sub-bullets.
- Preserve existing `[ref](naholo://objectives/{id})` links and `[x]` done states for OBJs that are still present.
- Add new OBJs as `- [ ]`. Remove deleted OBJs (only if they have no `#### After-Action Report` heading — never remove a shipped OBJ).
- Renumber as needed; keep titles synced with the OBJ headings.

### 11. Print summary

Show the plan state. Use markdown link syntax. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

Plan complete for OP #42: "Implement user auth"

- Objectives: 6 total (0 done, 6 remaining)
- Operation: [OPERATION.md]({operationDir}/notes/OPERATION.md)
- Objectives: [OBJECTIVES.md]({operationDir}/OBJECTIVES.md)

Next:

- Looks good → run `/splash` to ship OBJ 1
- Plan adjustment → re-run `/objs "freeform instructions"` or edit EXECUTION directly
- Direction change → re-run `/recon "freeform instructions"` to revise MISSION
- Optionally → `/sitrep` to push current plan to the server

## Rules

- **EXECUTION-only**: `/objs` writes (or revises) `## EXECUTION` and mirrors to `OBJECTIVES.md`. It does NOT touch `## MISSION` — direction changes belong to `/recon`.
- **MISSION must exist**: abort with a "run `/recon` first" message if MISSION is absent or missing required subsections.
- **No sub-objectives**: every OBJ is flat. If you feel the urge to sub-bullet, split into two OBJs.
- **Completed OBJs are immutable**: an OBJ with a `#### After-Action Report` heading MUST NOT be edited, renumbered, or removed. New OBJs from FRAGO are appended after the last existing OBJ.
- **Decisions commit to one path**: every OBJ goal names the chosen approach. "Pick A or B" phrasing is a bug — redraft, or ask `/recon` to add the missing Warning Order.
- **Preserve `[ref]` links** in OBJECTIVES.md.
- **Respect existing done states**: don't uncheck `[x]` items in OBJECTIVES.md.
- **OPERATION.md has exactly three top-level sections**: SITUATION, MISSION, EXECUTION. Nothing else. Per-OBJ progress lives in EXECUTION's AARs; chronological events live in TIMELINE.md.
- **Rejected sub-bullets**: comma-join alternatives, no reasons unless the user added them.
- **Do NOT implement any code** — only edit `OPERATION.md`, `OBJECTIVES.md`, and `TIMELINE.md`.
- Print the summary as raw markdown — no surrounding fence.
