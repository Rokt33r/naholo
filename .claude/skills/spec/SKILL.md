---
name: spec
description: Create SPEC.md executable spec from OPERATION.md context and update OBJECTIVES.md for an infiled Naholo operation.
argument-hint: '[operationNumber] ["extra instructions in quotes"]'
---

# Spec — Create Executable Spec

Read the local operation state (from `/infil`), research the codebase, and create `SPEC.md` as an executable specification. Update `OBJECTIVES.md` to reflect the spec's objective structure, and append a Timeline entry to `OPERATION.md`.

## Arguments

Optional operation number as first token (e.g., `42`). If provided, resolve its local directory via `naholo agent ops path 42`. If the directory does not exist on disk, tell the user to run `/infil 42` first.

Anything after in quotes is extra instructions (e.g., `"Only focus on the API layer"`, `"Ref docs/style.md"`). Parse naturally.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

0.5. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

1. **Find infiled operation**: If an operation number was provided, use it. Otherwise read the MCP resource `naholo://local/operations` to list infiled operations.
   - If none exist → tell user to run `/infil {operationNumber}` first and abort.
   - If multiple exist → show the list and ask user which one to use.

2. **Resolve operation directory**: Run `naholo agent ops path {operationNumber}` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it (e.g. `{operationDir}/OBJECTIVES.md`, `{operationDir}/notes/OPERATION.md`).

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

6. **Create SPEC.md**: Write the executable spec to `{operationDir}/notes/SPEC.md`. The first line MUST be `# SPEC — OP #{operationNumber}: {operation title}`. The file has NO frontmatter — its existence is the gate that signals the spec is ready for `/ship`.

   Include:
   - **Goal**: Clear 1-2 sentence description of what this spec achieves and why
   - **Prerequisites**: What must be done before this spec
   - **Architecture Decisions**: Key technical choices with reasoning
   - **Objectives**: Numbered objectives in dependency order using hierarchical numbering (`### 1. Objective title`, `### 2. Objective title`), broken into sub-objectives with hierarchical-numbered plain bullets (`- 1.1. Sub-objective`, `- 1.2. Sub-objective` — NOT `- [ ]` checkboxes — SPEC.md is a spec, not a tracker). Each sub-objective should specify:
     - Exact file paths to create or modify
     - What the code should do (behavior, not full implementation)
     - Key details that would require investigation to discover (API shapes, schema fields, type signatures)
   - **Notes**: Edge cases, gotchas, or decisions deferred to later

   **Important**: SPEC.md must NOT contain `- [ ]` or `- [x]` checkboxes. Progress tracking belongs exclusively in OBJECTIVES.md.

   Quality bar: the spec must be self-contained and executable — another session should be able to implement it by reading ONLY SPEC.md and CLAUDE.md.

7. **Update OPERATION.md**: Append a single bullet to the `## Timeline` section of `{operationDir}/notes/OPERATION.md`:

   `- **{date} — spec**: Elaborated spec. {N} objectives, {M} sub-objectives. {brief summary of key decisions}`.

   Do NOT add a `## Spec` section (or any other new section). OPERATION.md must retain exactly four sections: Pain, Resolution, Open questions, Timeline.

8. **Update OBJECTIVES.md**: OBJECTIVES.md is the canonical objective list and must mirror the spec's objective structure exactly. Update it as follows:
   - Every numbered objective in the spec (`### 1. Objective title`) → a top-level `- [ ] 1. Objective title` entry in OBJECTIVES.md
   - Every sub-objective bullet in the spec (`- 1.1. Sub-objective`) → an indented `  - [ ] 1.1. Sub-objective` entry under its parent in OBJECTIVES.md
   - Use short objective names (e.g., "1. Add profile selection prompt"), not full descriptions with file paths — those stay in SPEC.md
   - Existing objectives with `[ref]` links → keep their `[ref]` links
   - Preserve any existing `[x]` done states
   - No objective in the spec should be missing from OBJECTIVES.md

9. **Print summary and prompt for review**: Show what was elaborated (objective count, new objectives added, files researched). Use markdown link syntax with the absolute paths from step 2 so the user can click to open them. Print as raw markdown — no surrounding fence.

   Example (printed directly, not fenced):

   Spec ready for OP #42: "Implement user auth"
   - Objectives: 5 top-level, 18 sub-objectives (3 new, 2 superseded)
   - Researched:
     - [src/auth/](src/auth/)
     - [src/server/services/operator.ts](src/server/services/operator.ts)
     - [src/db/schema/operator.ts](src/db/schema/operator.ts)
   - Spec: [SPEC.md]({operationDir}/notes/SPEC.md)
   - Objectives: [OBJECTIVES.md]({operationDir}/OBJECTIVES.md)

   Next:
   - Looks good → run `/ship` to implement
   - Changes needed → edit SPEC.md directly or tell me what to change
   - Optionally → `/sitrep` to push objectives and spec to the server

   Substitute `{operationDir}` with the absolute path from step 2.

## Rules

- **Do NOT implement any code** — only update `SPEC.md`, `OPERATION.md`, and `OBJECTIVES.md`.
- **Preserve existing [ref] links** — don't remove or modify objective IDs from OBJECTIVES.md.
- **Respect existing done states** — don't uncheck `[x]` items.
- **OBJECTIVES.md is the canonical objective list** — every objective and sub-objective in the spec MUST have a corresponding entry in OBJECTIVES.md. Do NOT create objectives on the server — the user will run `/sitrep` after reviewing.
- **Keep OBJECTIVES.md in sync with SPEC.md** — whenever the spec's objective structure changes — whether during `/spec` or from user edits afterward — update OBJECTIVES.md to match. Add new objectives, remove deleted ones, rename changed ones. OBJECTIVES.md must always mirror the spec.
- **Never delete implemented objectives from SPEC.md** — if an objective is checked `[x]` in OBJECTIVES.md, it has been implemented. You MUST NOT delete or rewrite it in SPEC.md. If a sub-objective is superseded by a later objective (e.g., a refactor replaces an earlier approach), use strikethrough (`~~`) on the old sub-objective text and append a brief note pointing to the replacement (e.g., `~~- 1.3. Old approach~~ → Replaced by derived state in Objective 4`). New objectives can be added freely. This preserves the audit trail of what was actually done.
- **No checkboxes in SPEC.md** — SPEC.md is a spec document, not a progress tracker. Use plain `- ` bullets for sub-objectives, never `- [ ]` or `- [x]`.
- **OPERATION.md has exactly four sections**: Pain, Resolution, Open questions, Timeline. Do NOT add `## Spec`, `## Progress`, or anything else. Progress entries go in `## Timeline` as dated bullets.
- **Spec-only until /ship**: After `/spec` completes, all change requests must edit SPEC.md (and OBJECTIVES.md to stay in sync) only — do NOT implement code. The user must give explicit clearance by running `/ship`. After any SPEC change, print the SPEC link and prompt the user to run `/ship` when ready.
- Print the summary as raw markdown — no surrounding fence.
