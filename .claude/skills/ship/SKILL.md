---
name: ship
description: Execute an elaborated SPEC.md for an infiled Naholo issue — implement code, update checkboxes, track progress in PLAN.md.
argument-hint: '[issueNumber] ["extra instructions in quotes"]'
---

# Ship — Execute Spec

Implement the elaborated spec for an infiled issue. Work through tasks top-to-bottom, marking progress in `TASKS.md`.

## Arguments

Optional issue number as first token (e.g., `42`). If provided, use `.naholo/local/issues/42/` directly — if that directory doesn't exist, tell the user to run `/infil 42` first.

Anything after in quotes is extra instructions. Common patterns:

- **Task range**: `"1 ~ 3"` or `"Task 1 ~ Task 3"` — only implement tasks in the specified range.
- **Scope**: `"Only the API layer"` — limit implementation to a subset.
- **Context**: `"Ref docs/style.md"` — read additional reference docs.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

1. **Find infiled issue**: If an issue number was provided, use it. Otherwise read the MCP resource `naholo://local/issues` to list infiled issues.
   - If none exist → tell user to run `/infil {issueNumber}` first.
   - If multiple exist → show the list and ask user which one to use.

2. **Read spec**: Read `.naholo/local/issues/{issueNumber}/notes/SPEC.md`.
   - If `SPEC.md` does not exist → tell user to run `/spec` first and stop.

3. **Read TASKS.md**: Read `.naholo/local/issues/{issueNumber}/TASKS.md` to know current completion state.

4. **Implement tasks in order**: For each unchecked task in TASKS.md, top to bottom:
   - Read the corresponding task description in `notes/SPEC.md` (tasks use hierarchical numbering: `### 1. Title`, subtasks `- 1.1. Subtask`) — it specifies exact file paths, behavior, and key details
   - Implement the code changes described
   - After completing a subtask, immediately mark the corresponding line in `TASKS.md` as `- [x]`
   - SPEC.md has no checkboxes — do not add or modify checkboxes there
   - Follow all conventions in `CLAUDE.md`

5. **Verify as you go**: After completing each top-level task (e.g., all of "Task 1"):
   - Run the formatter: `npm run format`
   - Run type check: `npx tsc`
   - Fix any issues before moving to the next task

6. **Update PLAN.md with progress**: After completing each top-level task, append to `notes/PLAN.md`:
   - Under a `## Progress` heading (create it if it doesn't exist, append if it does): add a bullet with which task was completed, key files changed, any deviations from the spec.
   - Under `## Timeline` heading: append `- **{date} — ship**: Completed tasks {range}. {brief summary}`.
   - This keeps PLAN.md as the evolving context document for the session.

7. **Update SPEC.md if implementation deviates**: If the actual implementation differs from the spec (different approach, extra file needed, changed API shape), update the spec to reflect what was actually done. However, never delete implemented tasks — if a subtask in SPEC.md corresponds to a checked `[x]` entry in TASKS.md, use strikethrough (`~~`) on the superseded subtask text and append a note pointing to the replacement (e.g., `~~- 1.3. Old approach~~ → Replaced by derived state in Task 4`). New tasks can be added freely to SPEC.md and TASKS.md.

## Rules

- **Follow the spec**: The spec is the source of truth. Don't add features, refactor surrounding code, or make improvements beyond what's described.
- **TASKS.md is the only progress tracker**: SPEC.md is a reference spec with no checkboxes. Mark progress exclusively in TASKS.md.
- **Mark progress incrementally**: Check off each `- [ ]` → `- [x]` in TASKS.md immediately after completing it, not in a batch at the end. This lets the user see progress and resume if interrupted.
- **Don't improvise**: If a task can't be implemented as described (API changed, file doesn't exist, unexpected architecture), stop and explain what's blocking. Ask the user what to do.
- **Don't re-elaborate**: If the spec is missing details, implement your best interpretation. Don't rewrite task descriptions unless the implementation materially differs.
- **Respect CLAUDE.md**: Don't edit migration files, don't run `db:generate`, update `routes.ts` when adding/removing routes.
- **Respect task range**: If extra instructions specify a task range, only implement tasks in that range. Tasks before the range are assumed done; tasks after are left for later.
