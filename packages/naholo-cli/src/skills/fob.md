---
name: fob
description: Forward Operating Base — drop an idea, get an op. Creates a new operation server-side (with an optional first log) and chains `/infil` so the session lands infiled in one gesture.
argument-hint: '[<title>\n<content lines...>]'
---

# Fob — Forward Operating Base

Light idea-drop skill. Parses a freeform `/fob` prompt into a title + optional first log, calls `naholo agent fob` to create the operation server-side, then chains `/infil <n>` via the `Skill` tool so the session lands in the infil phase ready for `/warno` or `/raid`. Does **not** research the codebase — that's `/warno`'s job. Does **not** run while another op is already infiled.

## Arguments

Anything passed as an argument is treated as the `/fob` prompt. The first line is the title (may be empty); every line after the first is log content (may be empty).

- `/fob title-only` — title on the first line, no content → creates the op, posts no log.
- `/fob\ncontent only` — empty first line, content on subsequent lines → derive a title from the content, post the content as the first log.
- `/fob title\nfirst log content...` — title on line 1, log on the rest → creates the op and posts the log.
- `/fob` (no args) — abort with the usage block in step 5.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice (skip if empty), adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}` — though `/fob`'s job is to leave the session infiled to a brand-new op, so `{operationDir}` is populated by the chained `/infil` later, not by `/fob` itself.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

### 2. Infiled-state guard

`/fob` requires **no op infiled**. If `<op_status>` carries `currentOp` (i.e., the boot/op payload is not the empty `No infiled operation.` body), abort. Print as raw markdown (no surrounding fence) and stop:

> `/fob` cancelled. Operation #{currentOp} is already infiled. Run `/exfil` first to free the slot, then re-run `/fob`.

### 3. Parse the prompt

Read the raw `/fob` argument string. Split on the first newline:

- Everything before the first newline → `title` (after trimming).
- Everything after the first newline → `content` (after trimming the whole block).
- No newline at all → the whole argument is `title`, `content` is empty.

`title` and `content` may each be empty after trimming.

### 4. Resolve the title

- `title` non-empty → use it as-is.
- `title` empty, `content` non-empty → generate a short title (≤ ~60 chars) summarizing the content. Keep it concrete and skim-readable; this becomes the OP's title on the server.
- `title` empty and `content` empty → fall through to step 5.

### 5. Usage gate

If both `title` and `content` are empty after step 4, abort. Print as raw markdown (no surrounding fence) and stop:

> `/fob` needs a prompt. Pick one shape:
>
> - `/fob <title>` — title only
> - `/fob <title>\n<content lines...>` — title + first log
> - `/fob\n<content lines...>` — content only; `/fob` derives the title

Do not call the CLI.

### 6. Create the op via CLI

Run `naholo agent fob -T "<resolved title>" [-C "<content>"]` via the Bash tool. Pass `-C` only when `content` is non-empty after step 3.

Quote both arg values so the shell preserves embedded spaces and newlines. The CLI:

- refuses to run when an op is already infiled (same guard the skill ran in step 2 — belt and suspenders);
- creates the operation server-side via `client.createOperation`;
- posts the first log via `client.createOperationLog` when `-C` is supplied;
- prints a YAML block to stdout: `opNumber`, `title`, `url`.

Parse the stdout YAML and read `opNumber`. If the CLI errors (already infiled, network failure, etc.), surface the error message verbatim and stop — do not retry.

### 7. Chain `/infil` via the Skill tool

Invoke the `infil` skill through the `Skill` tool with the new op number as its argument. `/infil` handles the server-to-local fetch, the directory layout, and the SITUATION seeding in `OPERATION.md`. `/fob` does not seed any files itself — every on-disk output of this gesture comes from the chained `/infil`.

Once `/infil` returns, the session is in the **infil** phase, anchored to the new op. `/fob` itself prints no separate summary — `/infil`'s own end-of-skill summary is the final output the user sees.

## Post-fob phase

`/fob` is a one-shot launcher: it ends inside the chained `/infil` invocation, so the session phase after this skill returns is the **infil** phase (declared by `/infil`). `/fob` itself has no follow-up edit surface — any further refinement to SITUATION belongs to the infil phase, MISSION direction belongs to `/warno`, and any plan-cutting belongs to `/opord` or `/raid`.

## Rules

- **Server I/O lives in the CLI, not the skill** — `/fob` never calls MCP tools and never posts to the server directly. The only side effects it owns are the prompt parse, the CLI call, and the chained `/infil`.
- **No codebase research** — `/fob` is intentionally light. If the user wants planning context, they run `/recon` after infil, or `/warno` to research and write MISSION.
- **`-T` is mandatory at the CLI**: the skill is responsible for resolving a non-empty title before the CLI call (either from the user's first line or generated from content). Never call `naholo agent fob` with an empty title.
- **`-C` is optional**: only pass it when the user supplied content. Empty content means "create the op, no first log."
- **Refuse to run when an op is already infiled**: the skill checks `<op_status>` in step 2; the CLI re-checks before touching the server. Either layer aborts cleanly with the same constraint.
- **Always read `opNumber` from the CLI's YAML stdout** — do not parse other lines, do not regex against human prose. The contract is `opNumber: <n>`.
- **Always use absolute filesystem paths in link targets** in any abort messages this skill prints — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths.
