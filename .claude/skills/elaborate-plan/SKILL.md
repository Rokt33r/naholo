---
name: elaborate-plan
description: Elaborate a plan document in docs/plans/ so that it becomes executable by another agent session with minimum reinvestigation.
argument-hint: '[plan-id] ["extra instructions in quotes"]'
---

# Elaborate Plan

Elaborate a plan document in `docs/plans/` so that it becomes executable by another agent session with minimum reinvestigation.

## Arguments

The first token is the plan identifier like `p3` or `p3-s2`. Find the matching file in `docs/plans/` by prefix (e.g., `p3` matches `p3-adopt-shadcn.md`, `p3-s2` matches `p3-s2-whatever.md`).

Anything after the plan identifier in quotes is an extra instruction. Parse the quoted string and interpret it naturally. Common patterns:

- **Reference documents**: e.g., `/elaborate-plan p5 "Ref docs/style.md when elaborating"` — read the referenced document(s) and use them as additional context when elaborating the plan.
- **Scoping**: e.g., `/elaborate-plan p5 "Only Task 2 ~ Task 4"` — only elaborate the specified range of tasks, leaving other tasks untouched.

## What to do

1. **Find the plan file**: Glob for `docs/plans/{identifier}*.md`. If multiple files match, ask the user which one.

2. **Understand the current state**: Read the plan file. It may be a rough note, a partial outline, or already partially structured. Understand what the user wants to achieve.

3. **Research the codebase**: Investigate the codebase thoroughly to understand:
   - Current architecture and patterns relevant to the plan
   - Existing code that will be modified or extended
   - Dependencies and prerequisites
   - Conventions used in the project (naming, file structure, patterns)

4. **Elaborate the plan**: Rewrite the plan document to be self-contained and executable. The goal is that another Claude session can pick up this document and implement it without needing to re-explore the codebase. Include:
   - **Goal**: Clear 1-2 sentence description of what this plan achieves and why
   - **Prerequisites**: What must be done before this plan (link to other plan docs if relevant)
   - **Architecture Decisions**: Key technical choices with reasoning (frameworks, patterns, file locations)
   - **Tasks**: Numbered tasks in dependency order (tasks that depend on others come later), broken into subtasks with `- [ ]` checkboxes. `/ship-plan` will execute these top-to-bottom, so ordering matters. Each subtask should specify:
     - Exact file paths to create or modify
     - What the code should do (behavior, not full implementation)
     - Key details that would require investigation to discover (API shapes, schema fields, type signatures)
   - **Diagrams**: Include ASCII diagrams for complex flows (module interactions, data flow, state machines) where helpful
   - **Notes**: Edge cases, gotchas, or decisions deferred to later

5. **Write back**: Update the plan file with the elaborated content. Preserve any existing checked `[x]` items.

## Quality bar

The elaborated plan should pass this test: "Could another Claude session implement this plan by reading ONLY this document and CLAUDE.md, without needing to explore the codebase for architectural context?"

This means:

- File paths are exact, not vague ("modify the auth module")
- Schema fields include types and constraints
- API routes include method, path, request/response shapes
- Component specs include props, behavior, and which existing components to reference
- Task ordering respects dependencies

## What NOT to do

- Do NOT implement any code — only edit the plan document
- Do NOT create new files other than updating the plan
- Do NOT change CLAUDE.md or any source code
- Do NOT over-specify implementation details that are obvious from context (e.g., don't write out full function bodies)
- Do NOT add tasks for things already marked as `[x]` complete

## Example

Given a rough plan like:

```
Instead of initiating login process immediately, allow to switch user at the beginning if there are existing profiles.
```

Elaborate it into:

```markdown
# P4-S4: Improve CLI Login — Profile Selection

## Goal

When running `gunship login`, if existing profiles are found, show a selection menu before starting the OAuth flow. This lets operators switch between accounts without re-authenticating.

## Prerequisites

- [x] P4-S3: CLI package with login flow and profile management

## Architecture Decisions

- Use `@inquirer/select` for interactive profile selection (already used by Commander.js ecosystem, lightweight)
- Add a "Login with a new account" option at the end of the list
- If `--base-url` is provided, skip selection and go straight to login flow (scripting use case)

## Tasks

### Task 1: Add profile selection prompt

- [ ] `apps/gunship-cli/package.json` — add `@inquirer/select` dependency
- [ ] `apps/gunship-cli/src/commands/login.ts` — before starting OAuth flow:
  - Call `listProfiles()` from `src/profile.ts`
  - If profiles exist, show selection via `@inquirer/select`:
    - Each profile as `{name} ({baseUrl})` with value being the profile path
    - Final option: "Login with a new account"
  - If user picks an existing profile → call `setDefaultProfile(profilePath)` and print "Switched to {name}", exit
  - If user picks "Login with a new account" → continue to existing OAuth flow
  - If no profiles exist → continue to existing OAuth flow (current behavior)

### Task 2: Add `setDefaultProfile` helper

- [ ] `apps/gunship-cli/src/config.ts` — add `setDefaultProfile(profilePath: string)`:
  - Reads current config, sets `defaultProfile` to the given path, writes back
  - This is extracted from the end of the login command where it already does this

## Notes

- `listProfiles()` already exists in `src/profile.ts` — returns `Profile[]` with `name`, `baseUrl`, `token`, `path`
- Skip selection when `--base-url` is passed (user explicitly wants a new login)
```
