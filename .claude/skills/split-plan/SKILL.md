---
name: split-plan
description: Split a plan document into per-step files. Use when the user says "split plan" or invokes /split-plan.
argument-hint: '[plan-number, e.g. p24]'
disable-model-invocation: true
---

# Split Plan into Step Files

Split a plan document from `docs/plans/` into individual step files.

**Plan number:** `$ARGUMENTS`

## Instructions

1. **Find the main plan file.** Glob for `docs/plans/$ARGUMENTS-*.md` but exclude files matching `$ARGUMENTS-s*` (those are already-split step files). There should be exactly one match — that's the main plan file. If none found, tell the user and stop.

2. **Read the main plan file.** Identify step sections by looking for top-level headings that match the pattern `# <PREFIX>-S<number>: <Title>` (e.g. `# P24-S1: API Tokens`). The prefix is the uppercase form of `$ARGUMENTS`.

3. **Extract the overview.** Everything before the first step heading is the overview content.

4. **Extract each step.** For each step heading, capture everything from that heading up to (but not including) the next step heading or end of file. Record the step number and title.

5. **Write step files.** For each step, write a file at `docs/plans/$ARGUMENTS-s<number>-<slug>.md` where:
   - `<number>` is the step number (e.g. `1`, `2`)
   - `<slug>` is the title slugified: lowercase, spaces to hyphens, remove non-alphanumeric characters (except hyphens), collapse consecutive hyphens, trim leading/trailing hyphens
   - Each step file must be **self-contained** so a fresh Claude Code session can implement it without reading other files. Prepend a context block before the step content:
     - **Goal**: a 1-2 sentence summary of the overall plan's goal (from the overview)
     - **Prerequisites**: list any prior steps this step depends on and what they provide (e.g. "S1 adds the `project_worker_api_tokens` schema and auth flow")
     - **Scope**: remind the session to only implement this step, not the full plan
   - Then include the step section content as-is (including its heading)

6. **Rewrite the main plan file.** Replace its content with:
   - The overview content (from step 3)
   - A `## Steps` section with a numbered list linking to each step file:
     ```
     1. [P24-S1: API Tokens](p24-s1-api-tokens.md) — first line summary
     ```
   - For the summary after the `—`, use the first non-heading, non-empty line from the step content (trimmed). If it starts with a list marker or is too long, just use the title.

7. **Report what you did.** List the files created/updated.
