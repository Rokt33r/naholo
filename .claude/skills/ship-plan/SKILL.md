---
name: ship-plan
description: Implement an elaborated plan document from docs/plans/ and mark tasks as complete.
argument-hint: '[plan-id] ["extra instructions in quotes"]'
---

# Ship Plan

Implement an elaborated plan document from `docs/plans/` and mark tasks as complete.

## Arguments

The first token is the plan identifier like `p3` or `p3-s2`. Find the matching file in `docs/plans/` by prefix (e.g., `p3` matches `p3-adopt-shadcn.md`, `p3-s2` matches `p3-s2-whatever.md`).

Anything after the plan identifier in quotes is an extra instruction. Parse the quoted string and interpret it naturally. Common patterns:

- **Reference documents**: e.g., `/ship-plan p5 "Ref docs/style.md"` — read the referenced document(s) and use them as additional context when implementing.
- **Task range**: e.g., `/ship-plan p5 "Task 1 ~ Task 3"` — only implement tasks in the specified range (inclusive). Skip tasks outside the range. Tasks before the range are assumed already done; tasks after the range are left for later.

## What to do

1. **Find the plan file**: Glob for `docs/plans/{identifier}*.md`. If multiple files match, ask the user which one.

2. **Read the plan**: Read the plan file. It should be an elaborated plan with tasks and `- [ ]` checkboxes. If it's not elaborated (no tasks/checkboxes), tell the user to run `/elaborate-plan` first.

3. **Identify remaining work**: Find all unchecked `- [ ]` items. Skip any `- [x]` items — those are already done.

4. **Implement tasks in order**: For each unchecked task, top to bottom:
   - Read the task description carefully — it should specify exact file paths, behavior, and key details
   - Implement the code changes described
   - After completing a subtask, immediately mark it as `- [x]` in the plan doc
   - Follow all conventions in `CLAUDE.md` (formatting, routing patterns, schema rules, etc.)

5. **Verify as you go**: After completing each top-level task (e.g., all of "Task 1"), do a quick sanity check:
   - Run the formatter if source files were changed: `npm run format`
   - Check for TypeScript errors if applicable: `npm test`
   - Fix any issues before moving to the next task

6. **Update the plan doc**: The plan doc should reflect the final state — all implemented items checked off. If the implementation deviated from the plan (e.g., different approach, extra file needed), update the plan description to match what was actually done.

## Rules

- **Follow the plan**: The plan is the spec. Don't add features, refactor surrounding code, or make improvements beyond what's described.
- **Mark progress incrementally**: Check off each `- [ ]` → `- [x]` immediately after completing it, not in a batch at the end. This lets the user see progress and resume if interrupted.
- **Don't improvise**: If a task can't be implemented as described (e.g., API changed, file doesn't exist, unexpected architecture), stop and explain what's blocking and why. Ask the user what to do next instead of guessing or improvising a workaround.
- **Don't re-elaborate**: If the plan is missing details, implement your best interpretation. Don't rewrite task descriptions unless the implementation materially differs.
- **Respect CLAUDE.md**: Don't edit migration files, don't run `db:generate`, update `routes.ts` when adding/removing routes.

## Example

Given this plan:

```markdown
## Tasks

### Task 1: Add profile selection prompt

- [ ] `apps/gunship-cli/package.json` — add `@inquirer/select` dependency
- [ ] `apps/gunship-cli/src/commands/login.ts` — before starting OAuth flow:
  - Call `listProfiles()` from `src/profile.ts`
  - If profiles exist, show selection via `@inquirer/select`
  - If user picks existing profile → set as default and exit
  - If user picks "Login with a new account" → continue to OAuth flow

### Task 2: Add `setDefaultProfile` helper

- [ ] `apps/gunship-cli/src/config.ts` — add `setDefaultProfile(profilePath: string)`
```

Work through it as:

1. Read `apps/gunship-cli/package.json`, add `@inquirer/select`, mark `- [x]`
2. Read `apps/gunship-cli/src/commands/login.ts`, implement selection logic, mark `- [x]`
3. Verify Task 1 (type check, format)
4. Read `apps/gunship-cli/src/config.ts`, add the helper, mark `- [x]`
5. Verify Task 2

Final plan state:

```markdown
### Task 1: Add profile selection prompt

- [x] `apps/gunship-cli/package.json` — add `@inquirer/select` dependency
- [x] `apps/gunship-cli/src/commands/login.ts` — before starting OAuth flow:
      ...

### Task 2: Add `setDefaultProfile` helper

- [x] `apps/gunship-cli/src/config.ts` — add `setDefaultProfile(profilePath: string)`
```
