---
name: spec
description: Create SPEC.md executable spec from OPERATION.md context and update OBJECTIVES.md for an infiled Naholo operation.
argument-hint: '[operationNumber] ["extra instructions in quotes"]'
---

# Spec — Create Executable Spec

Two-phase flow:

- **Phase 1 — Rough plan**: research the codebase, draft a reviewable-but-not-yet-detailed SPEC.md (Goal / Prerequisites / Architecture Decisions / Affected files / optional diagrams / `## TODO - drafting` checklist / `## Objectives` with `### N. Title` headings + descriptions only / Notes), surface it via a clickable link, and gate on user approval via `AskUserQuestion`.
- **Phase 2 — Elaboration**: ask the user how to elaborate via `AskUserQuestion` (Elaborate all / Per section / Edit-add-context). Each branch fills `- N.M.` sub-bullets under `### N.` headings and ticks the matching `## TODO - drafting` checkbox. The whole `## TODO - drafting` section is deleted in the same edit that ticks the last box.

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
- **Deleted**: the entire section (heading + list) is removed in the same edit that ticks the last box. From that point on, SPEC.md is fully elaborated.
- **Skill manages it** — the agent writes/updates/deletes `## TODO - drafting` only at the documented transitions. Treat manual user edits to the list as authoritative on re-entry (a manually-ticked box means that section is treated as drafted; a manually-unticked box on an already-populated section means redraft that section).

## Arguments

Optional operation number as first token (e.g., `42`). If omitted, the skill picks the infiled operation via `naholo agent op-list` (or asks if multiple).

Anything after in quotes is extra instructions. The skill classifies the **intent** of these instructions from context — no keyword list, no regex match. Users phrase requests directly ("change the arch decision about plan mode", "drop objective 7", "rewrite the whole rough plan from scratch"), and the agent reads them like any other prompt. See step 6's re-run dispatch.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

0.5. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

1. **Find infiled operation**: If an operation number was provided, use it. Otherwise run `naholo agent op-list` to list infiled operations.
   - If none exist → tell user to run `/infil {operationNumber}` first and abort.
   - If multiple exist → show the list and ask user which one to use.

2. **Resolve operation directory**: Run `naholo agent op-path {operationNumber}` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it (e.g. `{operationDir}/OBJECTIVES.md`, `{operationDir}/notes/OPERATION.md`). If `{operationDir}` does not exist on disk, tell the user to run `/infil {operationNumber}` first and stop.

3. **Read local state**: Read the following files (paths resolved per step 2):
   - `{operationDir}/OBJECTIVES.md`
   - `{operationDir}/notes/OPERATION.md`
   - `{operationDir}/notes/SPEC.md` (if it exists — for re-runs)
   - All other notes in `{operationDir}/notes/`

4. **Prune unanswered open questions**: In `{operationDir}/notes/OPERATION.md`, under `## Open questions`, remove every `### {question}` block whose `Answer ->` line is empty or whitespace-only. Keep answered questions — their answers may be load-bearing context for the spec. Match with roughly `^### .+\n\s*Answer ->\s*$\n?` (multiline). When in doubt, leave the question in place.

5. **Research the codebase**: Investigate thoroughly to understand:
   - Current architecture and patterns relevant to the operation
   - Existing code that will be modified or extended
   - Dependencies, prerequisites, schema fields, type signatures
   - Conventions used in the project (from `CLAUDE.md` and existing code)

6. **Re-run dispatch + Phase 1 (Rough plan)**.

   **Re-run dispatch** — before drafting anything, classify the **intent** of the extra-instructions argument from context. Three intent classes:
   - **rough-edit** — instructions describe partial changes to the rough plan: Goal, Architecture Decisions, Affected Files, diagrams, top-level `### N.` titles or descriptions. The vast majority of redo requests look like this.
   - **rough-rewrite** — instructions explicitly say throw out the rough plan and write a new one (e.g., "rewrite the rough plan", "redo from scratch", "start over").
   - **none** — no extra instructions, or instructions about elaboration progress / per-section detail (those are handled inside Phase 2, not here).

   Then scan SPEC.md state and branch:
   - **SPEC.md missing** → enter Phase 1 fresh.
   - **SPEC.md exists with `## TODO - drafting`**:
     - rough-edit → re-enter Phase 1's review loop on the existing SPEC.md, applying the user's described edits as the first revision pass. No overwrite.
     - rough-rewrite → overwrite SPEC.md with a fresh Phase 1 draft. No confirmation prompt.
     - none → jump straight to Phase 2 menu (step 7). The TODO list is the resume signal.
   - **SPEC.md exists without `## TODO - drafting`** (fully elaborated):
     - extra instructions present → fall through to step 9 ("Targeted edit"). Apply the user's described edits to the existing spec without distinguishing intent.
     - no extra instructions → spec is already done. Skip to step 10 (print summary) without modifying any files.

   **Phase 1 — Rough plan** (when this branch is active):
   - Draft the rough plan content covering: Goal, Prerequisites, Architecture Decisions, Affected files, optional Workflow Diagrams, optional UI Wireframes for UI changes, `## TODO - drafting` (checklist of all top-level objectives, every box `[ ]`), `## Objectives` with `### N. Title` headings each followed by 1–3 sentence descriptions and **no `- N.M.` bullets**, and `## Notes`.
   - Write the rough content to `{operationDir}/notes/SPEC.md` via the `Write` tool.
   - Mirror the top-level objectives into `{operationDir}/OBJECTIVES.md` as `- [ ] {n}. {title}` (no sub-objective bullets yet). Preserve any existing `[ref]` links and `[x]` done states from prior runs.
   - Print a prominent clickable markdown link to SPEC.md in chat (e.g. "Rough plan ready — review at [SPEC.md]({operationDir}/notes/SPEC.md)") so the user can open the file in their editor with one click before answering the approval prompt.
   - Append a Timeline bullet to `{operationDir}/notes/OPERATION.md`: `- **{date} — spec (rough)**: Rough plan written. {brief summary}`.

   Then enter the **review loop** via `AskUserQuestion`, header `Rough plan?`, options:
   - "Approve" — proceed to Phase 2 menu (step 7).
   - "Request changes" — prompt the user (in chat) for free-form feedback, apply edits to the rough SPEC.md (Goal / Architecture Decisions / Affected files / diagrams / `### N.` titles + descriptions; if titles were added/removed/renamed, update the `## TODO - drafting` list to match in the same edit), then re-call this `AskUserQuestion`. Append a Timeline bullet `- **{date} — spec (rough revised)**: {summary}` per revision.

7. **Phase 2 — Elaboration**. Call `AskUserQuestion`, header `Elaborate?`, options:
   - "Elaborate all" — Fill every sub-objective in one batched edit.
   - "Elaborate per section" — Loop unchecked sections, approve/revise each.
   - "Edit / add context" — Escape hatch for free-form edits anywhere in SPEC.md.

   **Branch: Elaborate all.** Loop through each `### N.` section in order. For each section: draft the `- N.M. ...` sub-bullets, append them under that section, and in the same edit flip that section's `## TODO - drafting` box to `[x]`. After elaborating the **last** unchecked entry, delete the entire `## TODO - drafting` section (heading + list) in that edit instead of flipping its box. Proceed to step 8.

   **Branch: Elaborate per section.** Loop entries in `## TODO - drafting`, top to bottom, **skipping any already-checked entry** (resume support). For each unchecked entry:
   - Draft sub-bullets for `### N.`.
   - Append the `- N.M. ...` bullets under `### N.` in SPEC.md (same edit also flips that entry to `[x]`).
   - Call `AskUserQuestion`, header `Section {N}`, options: "Approve", "Request changes". On "Request changes", prompt the user in chat for free-form feedback, redraft the bullets, replace them in SPEC.md (the box stays `[x]` — we're revising the same approved-in-position section, not re-opening it), then re-ask.
   - On "Approve", continue to the next unchecked entry.
   - When the last entry ticks, delete the `## TODO - drafting` section entirely in the next edit. Proceed to step 8.

   **Branch: Edit / add context (escape hatch).** This branch is intentionally general — the user might want to provide extra context, revise the rough plan, edit already-elaborated sub-bullets, fix a typo in Notes, anything. The agent does NOT pre-restrict scope. Loop:
   - Prompt the user in chat for free-form input (no `AskUserQuestion` here — input is unstructured).
   - Comply with whatever the user describes. Apply the edit to SPEC.md wherever the user points: rough sections (Goal / Architecture Decisions / Affected files / diagrams / `### N.` titles or descriptions), already-populated sub-bullets under any `### N.`, Notes, etc.

8. **Sync OBJECTIVES.md and OPERATION.md** (runs only after `## TODO - drafting` has been deleted):
   - Mirror every `- N.M.` sub-bullet from SPEC.md into OBJECTIVES.md as `  - [ ] {n}.{m}. {title}` under its parent (preserving the top-level entries inserted in step 6). Preserve `[ref]` links and `[x]` done states.
   - Append a Timeline bullet to OPERATION.md: `- **{date} — spec (elaborated)**: Elaborated spec via {mode}. {N} objectives, {M} sub-objectives.` where `{mode}` is "elaborate all" or "per-section".

9. **Targeted edit** (only when re-run dispatch lands here — SPEC.md exists, no `## TODO - drafting`, extra instructions are non-empty): apply the extra instructions as edits to the existing spec, sync OBJECTIVES.md to match the new structure (preserving `[ref]` links and `[x]` done states), append a `- **{date} — spec (targeted edit)**: {summary}` bullet to OPERATION.md, then proceed to step 10.

10. **Print summary**: Show the elaboration state (rough / partially elaborated / fully elaborated, derived from `## TODO - drafting` presence and box counts) and the Next hints. Use markdown link syntax with the absolute paths from step 2 so the user can click to open them. Print as raw markdown — no surrounding fence.

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

- **Two-phase flow**: rough plan first (no plan mode — write SPEC.md, surface via clickable link, ask approval via `AskUserQuestion`), then elaboration. SPEC.md is fully elaborated only when `## TODO - drafting` has been deleted.
- **Skill manages the drafting list** — the agent writes/updates/deletes `## TODO - drafting` only at the documented transitions (Phase 1 write → boxes flipped during Phase 2 → section deleted on full elaboration → updated by Edit/add-context if titles change). Treat manual user edits to the list as authoritative on re-entry.
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
