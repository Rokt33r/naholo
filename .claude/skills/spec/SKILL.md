---
name: spec
description: Create SPEC.md executable spec from OPERATION.md context and update OBJECTIVES.md for an infiled Naholo operation.
argument-hint: '[operationNumber] ["extra instructions in quotes"]'
---

# Spec — Create Executable Spec

Read the local operation state (from `/infil`), research the codebase, and create `SPEC.md` as an executable specification. Update `OBJECTIVES.md` to reflect the spec's objective structure, and append a reference to `OPERATION.md`.

## Arguments

Optional operation number as first token (e.g., `42`). If provided, use `.naholo/local/operations/42/` directly — if that directory doesn't exist, tell the user to run `/infil 42` first.

Anything after in quotes is extra instructions (e.g., `"Only focus on the API layer"`, `"Ref docs/style.md"`). Parse naturally.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

1. **Find infiled operation**: If an operation number was provided, use it. Otherwise read the MCP resource `naholo://local/operations` to list infiled operations.
   - If none exist → tell user to run `/infil {operationNumber}` first.
   - If multiple exist → show the list and ask user which one to use.

2. **Read local state**: Read the following files:
   - `.naholo/local/operations/{operationNumber}/OBJECTIVES.md`
   - `.naholo/local/operations/{operationNumber}/notes/OPERATION.md`
   - `.naholo/local/operations/{operationNumber}/notes/SPEC.md` (if it exists — for re-runs)
   - All other notes in `.naholo/local/operations/{operationNumber}/notes/`

3. **Research the codebase**: Investigate thoroughly to understand:
   - Current architecture and patterns relevant to the operation
   - Existing code that will be modified or extended
   - Dependencies, prerequisites, schema fields, type signatures
   - Conventions used in the project (from `CLAUDE.md` and existing code)

4. **Create SPEC.md**: Write the executable spec to `notes/SPEC.md`. The file has NO frontmatter — its existence is the gate that signals the spec is ready for `/ship`.

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

   Quality bar: "Could another session implement this by reading ONLY SPEC.md and CLAUDE.md?"

5. **Update OPERATION.md**: Append to `notes/OPERATION.md` — do NOT rewrite, only append:
   - Under `## Spec` heading (create if needed): note "Spec elaborated on {date}" with a pointer to SPEC.md and a brief summary of key decisions.
   - Under `## Timeline` heading: append `- **{date} — spec**: Elaborated spec. {N} objectives, {N} sub-objectives. {brief summary of key decisions}`.

6. **Update OBJECTIVES.md**: OBJECTIVES.md is the canonical objective list and must mirror the spec's objective structure exactly. Update it as follows:
   - Every numbered objective in the spec (`### 1. Objective title`) → a top-level `- [ ] 1. Objective title` entry in OBJECTIVES.md
   - Every sub-objective bullet in the spec (`- 1.1. Sub-objective`) → an indented `  - [ ] 1.1. Sub-objective` entry under its parent in OBJECTIVES.md
   - Use short objective names (e.g., "1. Add profile selection prompt"), not full descriptions with file paths — those stay in SPEC.md
   - Existing objectives with `[ref]` links → keep their `[ref]` links
   - Preserve any existing `[x]` done states
   - No objective in the spec should be missing from OBJECTIVES.md

7. **Print summary**: Show what was elaborated (objective count, new objectives added, files researched). Use markdown link syntax for file paths so the user can click to open them (e.g., `[SPEC.md](.naholo/local/operations/{N}/notes/SPEC.md)`). Tell the user to run `/sitrep` to push objectives and spec to the server after review.

## Rules

- **Do NOT implement any code** — only update `SPEC.md`, `OPERATION.md`, `OBJECTIVES.md`, and the server note.
- **Do NOT create new source files** — only modify operation/spec docs.
- **Preserve existing [ref] links** — don't remove or modify objective IDs from OBJECTIVES.md.
- **Respect existing done states** — don't uncheck `[x]` items.
- **OBJECTIVES.md is the canonical objective list** — every objective and sub-objective in the spec MUST have a corresponding entry in OBJECTIVES.md. Do NOT create objectives on the server — the user will run `/sitrep` after reviewing.
- **Keep OBJECTIVES.md in sync with SPEC.md** — whenever the spec's objective structure changes — whether during `/spec` or from user edits afterward — update OBJECTIVES.md to match. Add new objectives, remove deleted ones, rename changed ones. OBJECTIVES.md must always mirror the spec.
- **Never delete implemented objectives from SPEC.md** — if an objective is checked `[x]` in OBJECTIVES.md, it has been implemented. You MUST NOT delete or rewrite it in SPEC.md. If a sub-objective is superseded by a later objective (e.g., a refactor replaces an earlier approach), use strikethrough (`~~`) on the old sub-objective text and append a brief note pointing to the replacement (e.g., `~~- 1.3. Old approach~~ → Replaced by derived state in Objective 4`). New objectives can be added freely. This preserves the audit trail of what was actually done.
- **No checkboxes in SPEC.md** — SPEC.md is a spec document, not a progress tracker. Use plain `- ` bullets for sub-objectives, never `- [ ]` or `- [x]`.
- **Do NOT rewrite OPERATION.md** — only append a reference to the spec. OPERATION.md is the evolving context document and should not be overwritten.
- Follow the same quality bar as `/elaborate-plan`: the spec must be self-contained and executable.
