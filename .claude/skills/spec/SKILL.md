---
name: spec
description: Create SPEC.md executable spec from OPERATION.md context and update OBJECTIVES.md for an infiled Naholo operation.
argument-hint: '[operationNumber] ["extra instructions in quotes"]'
---

# Spec — Create Executable Spec

Two-phase flow:

- **Phase 1 — Rough plan**: research the codebase, draft a reviewable-but-not-yet-detailed SPEC.md (Goal / Prerequisites / Architecture Decisions / Affected files / optional diagrams / `## TODO - drafting` checklist / `## Objectives` with `### N. Title` headings + descriptions only / Notes), and surface it via a clickable link.
- **Phase 2 — Elaboration**: ask the user how to elaborate via `AskUserQuestion` (Elaborate all / Elaborate per section). Each branch fills `- N.M.` sub-bullets under `### N.` headings and ticks the matching `## TODO - drafting` checkbox. After the last box ticks, a `Finalize` gate asks Squash-and-finalize / Finalize-as-is; the `## TODO - drafting` section is deleted only when the user picks one of those finalize options.

The presence of `## TODO - drafting` is the elaboration gate — `/ship` refuses while it exists.

## SPEC.md format

A SPEC.md is fully elaborated when `## TODO - drafting` is absent.

Layout when rough or partially elaborated:

```
# SPEC — OP #{n}: {title}

## Goal
...

## Prerequisites
...

## Architecture Decisions
...


## (optional) Workflow diagram / Wireframes
...

## Affected files
...

## TODO - drafting

- [ ] 1. First objective
- [x] 2. Second objective (already elaborated below)
- [ ] 3. Third objective

## Objectives

### 1. First objective

Short description (no `- N.M.` bullets yet — section is rough).

### 2. Second objective

Description.

- 2.1. Concrete sub-objective with file paths and behavior
- 2.2. Another sub-objective

### 3. Third objective

Description (no `- N.M.` bullets yet — section is rough).

## Notes
...
```

Layout when fully elaborated: identical, minus the `## TODO - drafting` section. Every `### N.` has populated `- N.M.` bullets.

### `## TODO - drafting` lifecycle

- **Heading**: exactly `## TODO - drafting` (hyphen, single space either side).
- **Position**: immediately before `## Objectives`.
- **Body**: a flat checklist whose entries mirror, in order, each top-level `### N. Title` in `## Objectives`. Format: `- [ ] N. Title` or `- [x] N. Title` — the same `N. Title` text as the heading.
- **Created**: by Phase 1 with all boxes unchecked.
- **Updated**: each box flips `[ ]` → `[x]` immediately after that section's `- N.M.` sub-bullets are written under its `### N.`.
- **Deleted**: the entire section is removed only as part of the Finalize gate's Squash or As-is branch (step 8), after the user explicitly chooses one. Ticking the last box does NOT delete the section — the gate does.
- **Skill manages it** — the agent writes/updates/deletes `## TODO - drafting` only at the documented transitions. Treat manual user edits to the list as authoritative on re-entry (a manually-ticked box means that section is treated as drafted; a manually-unticked box on an already-populated section means redraft that section).

## Arguments

Optional operation number as first token (e.g., `42`). If omitted, the skill picks the infiled operation via `naholo agent op-list` (or asks if multiple).

Anything after in quotes is extra instructions. The skill classifies the **intent** of these instructions from context — no keyword list, no regex match. Users phrase requests directly ("change the arch decision about plan mode", "drop objective 7", "rewrite the whole rough plan from scratch"), and the agent reads them like any other prompt. See step 6's re-run dispatch.

## What to do

### 0. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 0.5. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

### 1. Find infiled operation

If an operation number was provided, use it. Otherwise run `naholo agent op-list` to list infiled operations.

- If none exist → tell user to run `/infil {operationNumber}` first and abort.
- If multiple exist → show the list and ask user which one to use.

### 2. Resolve operation directory

Run `naholo agent op-path {operationNumber}` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it (e.g. `{operationDir}/OBJECTIVES.md`, `{operationDir}/notes/OPERATION.md`). If `{operationDir}` does not exist on disk, tell the user to run `/infil {operationNumber}` first and stop.

### 3. Read local state

Read the following files (paths resolved per step 2):

- `{operationDir}/OBJECTIVES.md`
- `{operationDir}/notes/OPERATION.md`
- `{operationDir}/notes/SPEC.md` (if it exists — for re-runs)
- All other notes in `{operationDir}/notes/`

### 4. Prune unanswered open questions

In `{operationDir}/notes/OPERATION.md`, under `## Open questions`, remove every `### {question}` block whose `Answer ->` line is empty or whitespace-only. Keep answered questions — their answers may be load-bearing context for the spec. Match with roughly `^### .+\n\s*Answer ->\s*$\n?` (multiline). When in doubt, leave the question in place.

### 5. Research the codebase

Investigate thoroughly to understand:

- Current architecture and patterns relevant to the operation
- Existing code that will be modified or extended
- Dependencies, prerequisites, schema fields, type signatures
- Conventions used in the project (from `CLAUDE.md` and existing code)

### 6. Re-run dispatch + Phase 1 (Rough plan)

**Re-run dispatch** — before drafting anything, classify the **intent** of the extra-instructions argument from context. Three intent classes:

- **rough-edit** — instructions describe partial changes to the rough plan: Goal, Architecture Decisions, Affected Files, diagrams, top-level `### N.` titles or descriptions. The vast majority of redo requests look like this.
- **rough-rewrite** — instructions explicitly say throw out the rough plan and write a new one (e.g., "rewrite the rough plan", "redo from scratch", "start over").
- **none** — no extra instructions, or instructions about elaboration progress / per-section detail (those are handled inside Phase 2, not here).

Then scan SPEC.md state and branch:

- **SPEC.md missing** → enter Phase 1 fresh.
- **SPEC.md exists with `## TODO - drafting`**:
  - rough-edit → apply the described edits to the existing SPEC.md (rough-plan sections), append a `- **{date} — spec (rough revised)**` Timeline bullet, then proceed to step 7 (Phase 2 entry menu). No overwrite.
  - rough-rewrite → overwrite SPEC.md with a fresh Phase 1 draft. No confirmation prompt.
  - none → jump straight to Phase 2 menu (step 7). The TODO list is the resume signal.
- **SPEC.md exists without `## TODO - drafting`** (fully elaborated):
  - extra instructions present → fall through to step 10 ("Targeted edit"). Apply the user's described edits to the existing spec without distinguishing intent.
  - no extra instructions → spec is already done. Skip to step 11 (print summary) without modifying any files.

**Phase 1 — Rough plan** (when this branch is active):

- Draft the rough plan content covering: Goal, Prerequisites, Architecture Decisions, Affected files, optional Workflow Diagrams, optional UI Wireframes for UI changes, `## TODO - drafting` (checklist of all top-level objectives, every box `[ ]`), `## Objectives` with `### N. Title` headings each followed by 1–3 sentence descriptions and **no `- N.M.` bullets**, and `## Notes`.
- Write the rough content to `{operationDir}/notes/SPEC.md` via the `Write` tool.
- Mirror the top-level objectives into `{operationDir}/OBJECTIVES.md` as `- [ ] {n}. {title}` (no sub-objective bullets yet). Preserve any existing `[ref]` links and `[x]` done states from prior runs.
- Print a prominent clickable markdown link to SPEC.md in chat (e.g. "Rough plan ready — review at [SPEC.md]({operationDir}/notes/SPEC.md)") so the user can open the file in their editor with one click before answering the approval prompt.
- Append a Timeline bullet to `{operationDir}/notes/OPERATION.md`: `- **{date} — spec (rough)**: Rough plan written. {brief summary}`.

After writing SPEC.md and surfacing the link, proceed directly to step 7 (Phase 2 entry menu) — there is no separate rough-plan approval gate. Rough-plan revisions are handled via step 7's "Other" branch (see objective 2).

### 7. Phase 2 — Elaboration

Call `AskUserQuestion`, header `Elaborate`, question stem `"Start elaboration — all at once, or per section?"` followed by the standard escape-hatch hint suffix (see objective 5 / rule below), options:

- "Elaborate all" — Fill every sub-objective in one batched edit.
- "Elaborate per section" — Loop unchecked sections, checkpoint after each.

**Branch: Elaborate all.** Loop through each `### N.` section in order. For each section: draft the `- N.M. ...` sub-bullets, append them under that section, and in the same edit flip that section's `## TODO - drafting` box to `[x]`. When the last entry ticks, leave `## TODO - drafting` in place and proceed to step 8 (Final approval gate).

**Branch: Elaborate per section.** Loop entries in `## TODO - drafting`, top to bottom, **skipping any already-checked entry** (resume support). For each unchecked entry:

- Draft sub-bullets for `### N.`.
- Append the `- N.M. ...` bullets under `### N.` in SPEC.md (same edit also flips that entry to `[x]`).
- Call `AskUserQuestion`, header `Elaborate`, question stem `"Continue elaboration?"` followed by the standard escape-hatch hint suffix (see objective 5 / rule below), two declared options: "Next section" and "Finish all remaining". The three branches:
  1. "Next section" → continue the loop on the next unchecked TODO entry (top-to-bottom).
  2. "Finish all remaining" → switch to elaborate-all behavior for every remaining unchecked entry (no further per-section checkpoints), then proceed to step 8 (Final approval gate).
  3. "Other" with free-text → apply revisions anywhere in SPEC.md (same logic as the Phase 2 entry-menu's Other branch — rough-plan vs post-rough Timeline-bullet selection per the Other branch's step 4); already-`[x]` boxes stay `[x]`; if titles changed, update `## TODO - drafting` in the same edit; re-ask the same checkpoint.
- When the last entry ticks, leave `## TODO - drafting` in place and proceed to step 8 (Final approval gate).

**Branch: Other (auto-appended free-text).** "Other" is auto-injected by `AskUserQuestion`; the user typed freeform feedback in that slot. Single-pass body:

1. Identify whether the typed feedback targets rough-plan content (Goal / Architecture Decisions / Affected files / diagrams / `### N.` titles or descriptions) or post-rough content (Notes / already-populated `- N.M.` sub-bullets).
2. Apply the edits in SPEC.md.
3. If `### N.` titles were added/removed/renamed, update `## TODO - drafting` in the same edit so its entries match the new heading list (preserve `[x]` flips on still-present sections).
4. Append a Timeline bullet to OPERATION.md: rough-plan content → `- **{date} — spec (rough revised)**: {summary}`; post-rough content → `- **{date} — spec (revised)**: {summary}`.
5. Re-call the same Phase 2 entry-menu `AskUserQuestion`.

### 8. Final approval gate

Runs after both step 7 elaborate branches finish (the last `## TODO - drafting` box has just been ticked) but before step 9. Body:

1. The last box has just been ticked; `## TODO - drafting` stays in place.
2. Call `AskUserQuestion`: header `Finalize`, two declared options — "Squash spec timeline and finalize" and "Finalize as-is". Question stem: `"Finalize spec — squash the spec session's timeline bullets into one finalized entry, or keep them as-is for downstream context?"` Append the standard escape-hatch hint suffix (see objective 5 / rule below).
3. Squash branch: in one edit — (a) collapse every `- **{date} — spec (rough)**` / `- **{date} — spec (rough revised)**` / `- **{date} — spec (revised)**` bullet accumulated during this spec session into a single `- **{date} — spec (finalized)**: {one-line summary}` bullet at the end of OPERATION.md Timeline, (b) delete the `## TODO - drafting` section, (c) run the step 9 sync — mirror sub-bullets into OBJECTIVES.md but DO NOT append a separate elaborated bullet (the finalized bullet already covers it).
4. As-is branch: in one edit — (a) delete the `## TODO - drafting` section, (b) run the step 9 sync untouched (mirror sub-bullets, append `- **{date} — spec (elaborated)**: ...`).
5. Other branch: apply revisions anywhere in SPEC.md, append `- **{date} — spec (revised)**: {summary}`, re-ask the same Finalize question.

### 9. Sync OBJECTIVES.md and OPERATION.md

Runs as part of step 8's Squash or As-is branch. The branch determines whether the session's iterative Timeline bullets are squashed into one `- **{date} — spec (finalized)**` entry or preserved alongside an appended `- **{date} — spec (elaborated)**` entry.

- Mirror every `- N.M.` sub-bullet from SPEC.md into OBJECTIVES.md as `  - [ ] {n}.{m}. {title}` under its parent (preserving the top-level entries inserted in step 6). Preserve `[ref]` links and `[x]` done states.
- Append a Timeline bullet to OPERATION.md: `- **{date} — spec (elaborated)**: Elaborated spec via {mode}. {N} objectives, {M} sub-objectives.` where `{mode}` is "elaborate all" or "per-section".

### 10. Targeted edit

Only when re-run dispatch lands here — SPEC.md exists, no `## TODO - drafting`, extra instructions are non-empty: apply the extra instructions as edits to the existing spec, sync OBJECTIVES.md to match the new structure (preserving `[ref]` links and `[x]` done states), append a `- **{date} — spec (targeted edit)**: {summary}` bullet to OPERATION.md, then proceed to step 11.

### 11. Print summary

Show the elaboration state (rough / partially elaborated / fully elaborated, derived from `## TODO - drafting` presence and box counts) and the Next hints. Use markdown link syntax with the absolute paths from step 2 so the user can click to open them. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

Spec ready for OP #42: "Implement user auth"

- State: fully elaborated
- Objectives: 5 top-level, 18 sub-objectives (3 new, 2 superseded)
- Researched:
  - [src/auth/](src/auth/)
  - [src/server/services/operator.ts](src/server/services/operator.ts)
- Spec: [SPEC.md]({operationDir}/notes/SPEC.md)
- Objectives: [OBJECTIVES.md]({operationDir}/OBJECTIVES.md)

Next:

- Looks good → run `/ship` to implement
- Changes needed → re-run `/spec` with extra instructions, or edit SPEC.md directly
- Optionally → `/sitrep` to push objectives and spec to the server

If the state is rough or partially elaborated, swap the Next hints — point at re-running `/spec` to continue elaboration, not `/ship`.

## Rules

- **Two-phase flow**: rough plan first (no plan mode — write SPEC.md, surface via clickable link), then elaboration. SPEC.md is fully elaborated only when `## TODO - drafting` has been deleted.
- **Skill manages the drafting list** — the agent writes/updates/deletes `## TODO - drafting` only at the documented transitions (Phase 1 write → boxes flipped during Phase 2 → section deleted as part of the Finalize gate's Squash or As-is branch → updated by an Other-branch edit if titles change). Treat manual user edits to the list as authoritative on re-entry.
- **Standard escape-hatch hint suffix** — every `AskUserQuestion` `question` field in this skill ends with the verbatim suffix: `"Or pick Other (or escape this dialog) and type freeform feedback to revise the previous changes or any other part of SPEC.md."` Append it to each stage-specific stem (Phase 2 entry, per-section checkpoint, Finalize gate). The hint is constant across every question so users learn it once.
- **Every `AskUserQuestion` documents an "Other" branch** — "Other" is auto-appended by the UI (free-text input). The skill must specify what that branch does — typically: apply freeform revisions anywhere in SPEC.md, append the appropriate Timeline bullet (`spec (rough revised)` for rough-plan content, `spec (revised)` for post-rough), then re-ask the same question. Never write `AskUserQuestion` invocations that ignore "Other" or treat it as an error.
- **Spec-only until /ship**: `/ship` only runs against fully-elaborated specs (specs without `## TODO - drafting`). After any SPEC change, print the SPEC link and prompt the user appropriately.
- **Do NOT implement any code** — only update `SPEC.md`, `OPERATION.md`, and `OBJECTIVES.md`.
- **Preserve existing [ref] links** — don't remove or modify objective IDs from OBJECTIVES.md.
- **Respect existing done states** — don't uncheck `[x]` items in OBJECTIVES.md.
- **OBJECTIVES.md is the canonical objective list** — every objective and sub-objective in the spec MUST have a corresponding entry in OBJECTIVES.md. Do NOT create objectives on the server — the user will run `/sitrep` after reviewing.
- **Keep OBJECTIVES.md in sync with SPEC.md** — whenever the spec's objective structure changes, update OBJECTIVES.md to match. Add new objectives, remove deleted ones, rename changed ones.
- **Never delete implemented objectives from SPEC.md** — if an objective is checked `[x]` in OBJECTIVES.md, it has been implemented. You MUST NOT delete or rewrite it in SPEC.md. Use strikethrough (`~~`) on the superseded sub-objective text and append a brief replacement pointer (e.g., `~~- 1.3. Old approach~~ → Replaced by derived state in Objective 4`).
- **No checkboxes in SPEC.md sub-objectives** — `### N.` sections use plain `- N.M.` bullets, never `- [ ]` / `- [x]`. The **only** place checkboxes are allowed in SPEC.md is the transient `## TODO - drafting` section, and they disappear with it.
- **Elaborated sub-objectives must commit to one approach** — a sub-bullet says exactly _what we are going to do_, not "do A, or B, whichever works." If alternatives matter, mention them as commentary ("considered B but chose A because…") and still name the chosen path. The decision lives in SPEC.md, not at ship time. Phrasings like "pick whichever keeps tests green," "either X or Y," or "decide during implementation" inside a `- N.M.` bullet are bugs in the spec — redraft.
- **Pseudo-code snippets are encouraged for flow** — when prose makes a function's flow hard to follow, include a fenced code snippet under the sub-bullet. Use real identifiers and numbered comments (`// 1. ...`, `// 2. ...`) for the steps. Skip imports, error plumbing, and type ceremony — the goal is reader comprehension, not a working file. Snippets explain; they don't substitute for the implementation.
- **OPERATION.md has exactly four sections**: Pain, Resolution, Open questions, Timeline. Do NOT add `## Spec`, `## Progress`, or anything else. Progress entries go in `## Timeline` as dated bullets.
- Print the summary as raw markdown — no surrounding fence.
