---
name: spec
description: Elaborate PLAN.md into an executable spec and update TASKS.md for a locked-in Naholo issue.
argument-hint: '[issueNumber] ["extra instructions in quotes"]'
---

# Spec — Elaborate Plan

Read the local issue state (from `/infil`), research the codebase, and elaborate `PLAN.md` into an executable spec. Update `TASKS.md` to reflect the elaborated task structure.

## Arguments

Optional issue number as first token (e.g., `42`). If provided, use `.naholo/local/issues/42/` directly — if that directory doesn't exist, tell the user to run `/infil 42` first.

Anything after in quotes is extra instructions (e.g., `"Only focus on the API layer"`, `"Ref docs/style.md"`). Parse naturally.

## What to do

1. **Find locked issue**: If an issue number was provided, use it. Otherwise look for `.naholo/local/issues/*/` directories.
   - If none exist → tell user to run `/infil {issueNumber}` first.
   - If multiple exist → ask user which one to use.
   - Verify `.naholo/local/issues/{issueNumber}/` exists — if not, tell user to run `/infil` first.
   - Use the found issue number for all subsequent steps.

2. **Read local state**: Read the following files:
   - `.naholo/local/issues/{issueNumber}/TASKS.md`
   - `.naholo/local/issues/{issueNumber}/notes/PLAN.md`
   - All other notes in `.naholo/local/issues/{issueNumber}/notes/`

3. **Research the codebase**: Investigate thoroughly to understand:
   - Current architecture and patterns relevant to the plan
   - Existing code that will be modified or extended
   - Dependencies, prerequisites, schema fields, type signatures
   - Conventions used in the project (from `CLAUDE.md` and existing code)

4. **Elaborate PLAN.md**: Rewrite `notes/PLAN.md` into an executable spec. The file MUST start with a `specced: true` frontmatter block:

   ```markdown
   ---
   specced: true
   ---

   # Goal

   ...
   ```

   Include:
   - **Goal**: Clear 1-2 sentence description of what this plan achieves and why
   - **Prerequisites**: What must be done before this plan
   - **Architecture Decisions**: Key technical choices with reasoning
   - **Tasks**: Numbered tasks in dependency order, broken into subtasks with `- [ ]` checkboxes. Each subtask should specify:
     - Exact file paths to create or modify
     - What the code should do (behavior, not full implementation)
     - Key details that would require investigation to discover (API shapes, schema fields, type signatures)
   - **Notes**: Edge cases, gotchas, or decisions deferred to later

   Quality bar: "Could another session implement this by reading ONLY PLAN.md and CLAUDE.md?"

5. **Update TASKS.md**: Sync the task structure from the elaborated plan back to TASKS.md.
   - Existing tasks with `[ref]` links → keep their `[ref]` links
   - New tasks from elaboration → add without `[ref]` (will be created on `/exfil`)
   - Preserve any existing `[x]` done states

6. **Update PLAN.md on server**: Use the `update_note` MCP tool to push the elaborated PLAN.md content back to Naholo. You'll need the note ID — read it from the MCP resource `naholo://issues/{issueNumber}` to find the PLAN note's ID.

7. **Print summary**: Show what was elaborated (task count, new tasks added, files researched).

## Rules

- **Do NOT implement any code** — only update `PLAN.md`, `TASKS.md`, and the server note.
- **Do NOT create new source files** — only modify plan docs.
- **Preserve existing [ref] links** — don't remove or modify task IDs from TASKS.md.
- **Respect existing done states** — don't uncheck `[x]` items.
- Follow the same quality bar as `/elaborate-plan`: the elaborated plan must be self-contained and executable.
