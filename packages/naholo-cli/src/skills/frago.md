---
name: frago
description: 'Fragmentary Order: apply a combined WARNO + OPORD revision in one pass by chaining /warno then /opord with the same prompt. Use when a change touches both the WARNO and the task list.'
argument-hint: '["revision prompt"]'
---

# Frago — One-Pass WARNO + OPORD Revision

A thin chaining wrapper: `/frago` runs `/warno` to revise the WARNING ORDER, then `/opord` to reconcile the task list, forwarding the same freeform prompt to each. It is the natural applier of a RECON note whose `FRAGMENTARY ORDER` changes Constraints and tasks together.

## Arguments

A **revision prompt** describing the combined change. `/frago "<prompt>"` forwards it verbatim to both chained skills; bare `/frago` applies the change already shaped in context (a RECON note's `FRAGMENTARY ORDER`, or a pending suggestion).

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}`.

**If boot already ran this session**, run `naholo agent op` instead; treat its `<op_status>` payload as the current op status.

If `<op_status>` carries `No infilled operation.`, tell the user to run `/infil <opNum>` first and abort.

### 2. Load context

Read `{operationDir}/notes/OPERATION.md` (the live OP document) and `{operationDir}/TASKS.md`. When invoked bare, also read the RECON note (or recall the pending suggestion) carrying the shaped change.

### 3. Guard

Abort if either check fails:

- **Both orders present** — `OPERATION.md` has `## WARNING ORDER` and `## OPERATION ORDER`. If `## WARNING ORDER` is missing, point at `/warno`; if `## OPERATION ORDER` is missing, point at `/opord`.
- **Enough context to revise** — an explicit prompt, or a shaped change in context (a RECON note's `FRAGMENTARY ORDER`, or a pending suggestion). If neither, ask the user for a revision prompt.

### 4. Chain `/warno` then `/opord`

Invoke the `warno` skill via the `Skill` tool with the revision prompt as `args`, then invoke the `opord` skill the same way. `/warno` revises the WARNING ORDER in place; `/opord` reconciles OPERATION ORDER and `TASKS.md` against it. Each appends its own TIMELINE bullet. `/frago` ends with `/opord`'s summary; do not print a separate one.

## Post-frago phase

There is no post-frago phase. The chained `/opord` declares the **opord** phase on return, and the session inherits it. All post-opord-phase rules apply verbatim.

## Rules

- **Same prompt to both**: forward the revision prompt verbatim to `/warno` then `/opord`; each picks out its own concerns.
- **No stamp of its own**: `/frago` adds no TIMELINE bullet; the chained `/warno` and `/opord` stamp theirs.
- **Do NOT implement any code**: `/frago` only orchestrates; the chained skills own their edits.
- **Always use absolute filesystem paths in link targets**: e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
