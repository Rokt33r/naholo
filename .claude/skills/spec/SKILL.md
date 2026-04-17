---
name: spec
description: Create SPEC.md executable spec from PLAN.md context and update TASKS.md for an infiled Naholo issue.
argument-hint: '[issueNumber] ["extra instructions in quotes"]'
---

# Spec — Create Executable Spec

Read the local issue state (from `/infil`), research the codebase, and create `SPEC.md` as an executable specification. Update `TASKS.md` to reflect the spec's task structure, and append a reference to `PLAN.md`.

## Arguments

Optional issue number as first token (e.g., `42`). If provided, use `.naholo/local/issues/42/` directly — if that directory doesn't exist, tell the user to run `/infil 42` first.

Anything after in quotes is extra instructions (e.g., `"Only focus on the API layer"`, `"Ref docs/style.md"`). Parse naturally.

## What to do

1. **Find infiled issue**: If an issue number was provided, use it. Otherwise read the MCP resource `naholo://local/issues` to list infiled issues.
   - If none exist → tell user to run `/infil {issueNumber}` first.
   - If multiple exist → show the list and ask user which one to use.

2. **Read local state**: Read the following files:
   - `.naholo/local/issues/{issueNumber}/TASKS.md`
   - `.naholo/local/issues/{issueNumber}/notes/PLAN.md`
   - `.naholo/local/issues/{issueNumber}/notes/SPEC.md` (if it exists — for re-runs)
   - All other notes in `.naholo/local/issues/{issueNumber}/notes/`

3. **Research the codebase**: Investigate thoroughly to understand:
   - Current architecture and patterns relevant to the plan
   - Existing code that will be modified or extended
   - Dependencies, prerequisites, schema fields, type signatures
   - Conventions used in the project (from `CLAUDE.md` and existing code)

4. **Create SPEC.md**: Write the executable spec to `notes/SPEC.md`. The file has NO frontmatter — its existence is the gate that signals the spec is ready for `/ship`.

   Include:
   - **Goal**: Clear 1-2 sentence description of what this spec achieves and why
   - **Prerequisites**: What must be done before this spec
   - **Architecture Decisions**: Key technical choices with reasoning
   - **Tasks**: Numbered tasks in dependency order using hierarchical numbering (`### 1. Task title`, `### 2. Task title`), broken into subtasks with hierarchical-numbered plain bullets (`- 1.1. Subtask`, `- 1.2. Subtask` — NOT `- [ ]` checkboxes — SPEC.md is a spec, not a tracker). Each subtask should specify:
     - Exact file paths to create or modify
     - What the code should do (behavior, not full implementation)
     - Key details that would require investigation to discover (API shapes, schema fields, type signatures)
   - **Notes**: Edge cases, gotchas, or decisions deferred to later

   **Important**: SPEC.md must NOT contain `- [ ]` or `- [x]` checkboxes. Progress tracking belongs exclusively in TASKS.md.

   Quality bar: "Could another session implement this by reading ONLY SPEC.md and CLAUDE.md?"

5. **Update PLAN.md**: Append to `notes/PLAN.md` — do NOT rewrite, only append:
   - Under `## Spec` heading (create if needed): note "Spec elaborated on {date}" with a pointer to SPEC.md and a brief summary of key decisions.
   - Under `## Timeline` heading: append `- **{date} — spec**: Elaborated spec. {N} tasks, {N} subtasks. {brief summary of key decisions}`.

6. **Update TASKS.md**: TASKS.md is the canonical task list and must mirror the spec's task structure exactly. Update it as follows:
   - Every numbered task in the spec (`### 1. Task title`) → a top-level `- [ ] 1. Task title` entry in TASKS.md
   - Every subtask bullet in the spec (`- 1.1. Subtask`) → an indented `  - [ ] 1.1. Subtask` entry under its parent in TASKS.md
   - Use short task names (e.g., "1. Add profile selection prompt"), not full descriptions with file paths — those stay in SPEC.md
   - Existing tasks with `[ref]` links → keep their `[ref]` links
   - Preserve any existing `[x]` done states
   - No task in the spec should be missing from TASKS.md

7. **Print summary**: Show what was elaborated (task count, new tasks added, files researched). Use markdown link syntax for file paths so the user can click to open them (e.g., `[SPEC.md](.naholo/local/issues/{N}/notes/SPEC.md)`). Tell the user to run `/sitrep` to push tasks and spec to the server after review.

## Rules

- **Do NOT implement any code** — only update `SPEC.md`, `PLAN.md`, `TASKS.md`, and the server note.
- **Do NOT create new source files** — only modify plan/spec docs.
- **Preserve existing [ref] links** — don't remove or modify task IDs from TASKS.md.
- **Respect existing done states** — don't uncheck `[x]` items.
- **TASKS.md is the canonical task list** — every task and subtask in the spec MUST have a corresponding entry in TASKS.md. Do NOT create tasks on the server — the user will run `/sitrep` after reviewing.
- **Keep TASKS.md in sync with SPEC.md** — whenever the spec's task structure changes — whether during `/spec` or from user edits afterward — update TASKS.md to match. Add new tasks, remove deleted ones, rename changed ones. TASKS.md must always mirror the spec.
- **Never delete implemented tasks from SPEC.md** — if a task is checked `[x]` in TASKS.md, it has been implemented. You MUST NOT delete or rewrite it in SPEC.md. If a subtask is superseded by a later task (e.g., a refactor replaces an earlier approach), use strikethrough (`~~`) on the old subtask text and append a brief note pointing to the replacement (e.g., `~~- 1.3. Old approach~~ → Replaced by derived state in Task 4`). New tasks can be added freely. This preserves the audit trail of what was actually done.
- **No checkboxes in SPEC.md** — SPEC.md is a spec document, not a progress tracker. Use plain `- ` bullets for subtasks, never `- [ ]` or `- [x]`.
- **Do NOT rewrite PLAN.md** — only append a reference to the spec. PLAN.md is the evolving context document and should not be overwritten.
- Follow the same quality bar as `/elaborate-plan`: the spec must be self-contained and executable.
