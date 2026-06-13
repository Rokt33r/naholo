---
name: fob
description: Forward Operating Base — drop an idea, get an op. Creates a new operation server-side (with an optional first log) and chains `/infil` when no op is already infiled.
argument-hint: '[<title>\n<content lines...>]'
---

# Fob — Forward Operating Base

Light idea-drop skill. Parses a freeform `/fob` prompt into a title + optional first log, calls `naholo agent fob` to create the operation server-side, then chains `/infil <n>` via the `Skill` tool so the session lands in the infil phase ready for `/warno` or `/raid`. Does **not** research the codebase — that's `/warno`'s job. When an op is already infiled, the new op + optional log still land on the server but `/fob` skips the `/infil` chain so the in-flight infiled state stays intact.

## Arguments

Anything passed as an argument is treated as the `/fob` prompt. The first line is the title (may be empty); every line after the first is log content (may be empty).

- `/fob title-only` — title on the first line, no content → creates the op, posts no log.
- `/fob\ncontent only` — empty first line, content on subsequent lines → derive a title from the content, post the content as the first log.
- `/fob title\nfirst log content...` — title on line 1, log on the rest → creates the op and posts the log.
- `/fob` (no args) — abort with the usage block in step 4.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice (skip if empty), adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}` — though `/fob`'s job is to leave the session infiled to a brand-new op, so `{operationDir}` is populated by the chained `/infil` later, not by `/fob` itself.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

### 2. Parse the prompt

Read the raw `/fob` argument string. Split on the first newline:

- Everything before the first newline → `title` (after trimming).
- Everything after the first newline → `content` (after trimming the whole block).
- No newline at all → the whole argument is `title`, `content` is empty.

`title` and `content` may each be empty after trimming.

### 3. Resolve the title

- `title` non-empty → use it as-is.
- `title` empty, `content` non-empty → generate a short title (≤ ~60 chars) summarizing the content. Keep it concrete and skim-readable; this becomes the OP's title on the server.
- `title` empty and `content` empty → fall through to step 4.

### 4. Usage gate

If both `title` and `content` are empty after step 3, abort. Print as raw markdown (no surrounding fence) and stop:

> `/fob` needs a prompt. Pick one shape:
>
> - `/fob <title>` — title only
> - `/fob <title>\n<content lines...>` — title + first log
> - `/fob\n<content lines...>` — content only; `/fob` derives the title

Do not call the CLI.

### 5. Create the op via CLI

Run `naholo agent fob -T "<resolved title>" [-C "<content>"]` via the Bash tool. Pass `-C` only when `content` is non-empty after step 2.

Quote both arg values so the shell preserves embedded spaces and newlines. The CLI:

- creates the operation server-side via `client.createOperation`;
- posts the first log via `client.createOperationLog` when `-C` is supplied;
- prints a YAML block to stdout: `opNumber`, `title`, `url`.

Parse the stdout YAML and read `opNumber`. If the CLI errors (network failure, auth, etc.), surface the error message verbatim and stop — do not retry.

### 6. Chain `/infil` (or skip when already infiled)

Branch on `<op_status>` from step 1:

- **`No infiled operation.`** → invoke the `infil` skill through the `Skill` tool with the new `opNumber` as its argument. `/infil` handles the server-to-local fetch, the directory layout, and the SITUATION seeding in `OPERATION.md`. `/fob` does not seed any files itself — every on-disk output of this branch comes from the chained `/infil`. Once `/infil` returns, the session is in the **infil** phase, anchored to the new op, and `/infil`'s own end-of-skill summary is the final output the user sees.
- **`currentOp` present** → do **not** chain `/infil`; clobbering the in-flight infiled directory would lose the user's current work. Print the following raw markdown (no surrounding fence) and stop:

  > Infiled op exists, skipped /infil.
  > To infil, /exfil first and /infil {opNumber} again.

  Substitute `{opNumber}` with the value parsed in step 5.

## Post-fob phase

`/fob` ends in one of two states:

- **Chained-`/infil` branch** — the session lands in the **infil** phase, anchored to the new op (declared by the chained `/infil`).
- **Skipped-`/infil` branch** — the session phase is unchanged from whatever was active before `/fob` ran (the infiled op and its phase stay exactly as they were). The new op exists on the server with its first log, but the local infiled directory is untouched.

In either case `/fob` itself has no follow-up edit surface — any further refinement to SITUATION belongs to the infil phase, the WARNO belongs to `/warno`, and any plan-cutting belongs to `/opord` or `/raid`.

## Rules

- **Server I/O lives in the CLI, not the skill** — `/fob` never calls MCP tools and never posts to the server directly. The only side effects it owns are the prompt parse, the CLI call, and the conditional `/infil` chain.
- **No codebase research** — `/fob` is intentionally light. If the user wants planning context, they run `/recon` after infil, or `/warno` to research and write the WARNO.
- **`-T` is mandatory at the CLI**: the skill is responsible for resolving a non-empty title before the CLI call (either from the user's first line or generated from content). Never call `naholo agent fob` with an empty title.
- **`-C` is optional**: only pass it when the user supplied content. Empty content means "create the op, no first log."
- **Never chain `/infil` while another op is already infiled**: chaining would clobber the in-flight infiled directory. Instead print the `Infiled op exists, skipped /infil. To infil, /exfil first and /infil {opNumber} again.` hint so the user can switch deliberately.
- **Always read `opNumber` from the CLI's YAML stdout** — do not parse other lines, do not regex against human prose. The contract is `opNumber: <n>`.
- **Always use absolute filesystem paths in link targets** in any abort messages this skill prints — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths.
