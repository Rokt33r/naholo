---
name: ship
description: Execute an elaborated SPEC.md for an infiled Naholo operation — implement code, update checkboxes, track progress in OPERATION.md.
argument-hint: '[operationNumber] ["extra instructions in quotes"]'
---

# Ship — Execute Spec

Implement the elaborated spec for an infiled operation. Work through objectives top-to-bottom, marking progress in `OBJECTIVES.md`.

## Arguments

Optional operation number as first token (e.g., `42`). If provided, resolve its local directory via `naholo agent ops path 42`. If the directory does not exist on disk, tell the user to run `/infil 42` first.

Anything after in quotes is extra instructions. Common patterns:

- **Objective range**: `"1 ~ 3"` or `"Objective 1 ~ Objective 3"` — only implement objectives in the specified range.
- **Scope**: `"Only the API layer"` — limit implementation to a subset.
- **Context**: `"Ref docs/style.md"` — read additional reference docs.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

0.5. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

1. **Find infiled operation**: If an operation number was provided, use it. Otherwise read the MCP resource `naholo://local/operations` to list infiled operations.
   - If none exist → tell user to run `/infil {operationNumber}` first.
   - If multiple exist → show the list and ask user which one to use.

2. **Resolve operation directory**: Run `naholo agent ops path {operationNumber}` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it (e.g. `{operationDir}/OBJECTIVES.md`, `{operationDir}/notes/SPEC.md`).

3. **Read spec**: Read `{operationDir}/notes/SPEC.md`.
   - If `SPEC.md` does not exist → tell user to run `/spec` first and stop.

4. **Read OBJECTIVES.md**: Read `{operationDir}/OBJECTIVES.md` to know current completion state.

5. **Implement objectives in order**: For each unchecked objective in OBJECTIVES.md, top to bottom:
   - Read the corresponding objective description in `{operationDir}/notes/SPEC.md` (objectives use hierarchical numbering: `### 1. Title`, sub-objectives `- 1.1. Sub-objective`) — it specifies exact file paths, behavior, and key details
   - Implement the code changes described
   - After completing a sub-objective, immediately mark the corresponding line in `OBJECTIVES.md` as `- [x]`
   - SPEC.md has no checkboxes — do not add or modify checkboxes there
   - Follow all conventions in `CLAUDE.md`

6. **Verify as you go**: After completing each top-level objective (e.g., all of "Objective 1"):
   - Run the formatter: `npm run format`
   - Run type check: `npx tsc`
   - Fix any issues before moving to the next objective

7. **Append Timeline entry**: After completing each top-level objective, append a single bullet to the `## Timeline` section of `{operationDir}/notes/OPERATION.md`:

   `- **{date} — ship**: Completed objectives {range}. Key files: {paths}. {any deviations from spec}`.

   Do NOT add a `## Progress` section (or any other new section). OPERATION.md has exactly four sections (Pain, Resolution, Open questions, Timeline) — ship progress lives in Timeline bullets only.

8. **Update SPEC.md if implementation deviates**: If the actual implementation differs from the spec (different approach, extra file needed, changed API shape), update the spec to reflect what was actually done. However, never delete implemented objectives — if a sub-objective in SPEC.md corresponds to a checked `[x]` entry in OBJECTIVES.md, use strikethrough (`~~`) on the superseded sub-objective text and append a note pointing to the replacement (e.g., `~~- 1.3. Old approach~~ → Replaced by derived state in Objective 4`). New objectives can be added freely to SPEC.md and OBJECTIVES.md.

## Rules

- **Follow the spec**: The spec is the source of truth. Don't add features, refactor surrounding code, or make improvements beyond what's described.
- **OBJECTIVES.md is the only progress tracker**: SPEC.md is a reference spec with no checkboxes. Mark progress exclusively in OBJECTIVES.md.
- **Mark progress incrementally**: Check off each `- [ ]` → `- [x]` in OBJECTIVES.md immediately after completing it, not in a batch at the end. This lets the user see progress and resume if interrupted.
- **OPERATION.md stays at four sections**: Pain, Resolution, Open questions, Timeline. No `## Progress`, no other sections. Progress bullets go in Timeline.
- **Don't improvise**: If an objective can't be implemented as described (API changed, file doesn't exist, unexpected architecture), stop and explain what's blocking. Ask the user what to do.
- **Don't re-elaborate**: If the spec is missing details, implement your best interpretation. Don't rewrite objective descriptions unless the implementation materially differs.
- **Respect CLAUDE.md**: Don't edit migration files, don't run `db:generate`, update `routes.ts` when adding/removing routes.
- **Respect objective range**: If extra instructions specify an objective range, only implement objectives in that range. Objectives before the range are assumed done; objectives after are left for later.
- Print end-of-session summaries as raw markdown — no surrounding fence.
