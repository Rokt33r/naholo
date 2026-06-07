---
name: recon
description: Enter a read-only Q&A phase on the infiled OP — load OPERATION.md + TIMELINE.md, answer questions, no edits and no syncs.
argument-hint: '["first question"]'
---

# Recon — Read-Only Q&A

Drop into a passive Q&A phase on the active infiled OP. Loads `OPERATION.md` + `TIMELINE.md` as context, then answers questions about the OP. Writes nothing — no `OPERATION.md` edits, no `TASKS.md` edits, no codebase edits, no `add-timeline` bullets, no server syncs.

Use when the user wants to think out loud, audit prior decisions, or get the lay of the land without committing to a phase-changing skill. Re-running `/recon` re-loads context but is otherwise idempotent.

## Arguments

Anything in quotes is an optional **first question**. When given, answer it after loading context. When omitted, load context and wait for the user's first question.

## What to do

### 1. Boot

If you haven't run `naholo agent boot` this session, run it now via the Bash tool. Adopt `<personality>` as your voice (skip if empty), adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}`. Read `currentOp` / `opTitle` inline from `<op_status>` for the readiness line. If `<op_status>` carries `No infiled operation.`, tell the user to run `/infil <opNum>` first and stop. Otherwise skip the boot call — `opPath` is already cached.

### 2. Load context

Read these now:

- `{operationDir}/notes/OPERATION.md` — the live OP document; re-read every invocation so manual mid-session edits land
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that (it's a fresh-session catch-up doc, not in-session state)

### 3. Acknowledge readiness and answer

Print a one-line readiness signal as raw markdown (no surrounding fence):

```
Recon ready on OP #{currentOp}: "{opTitle}". Ask away.
```

Then branch:

- **First-question arg provided** → answer it immediately, using the loaded context. Pull additional files (LOGS.yml, other notes, codebase) only when the question genuinely needs them.
- **No arg** → stop after the readiness line and wait for the user's next message.

Subsequent user turns in the recon phase are questions to answer the same way — read on demand, answer, no writes.

## Post-recon phase

Once this skill returns, the session is in the **recon** phase. The phase persists until a different phase-changing skill runs (`/infil`, `/warno`, `/opord`, `/splash`, `/chop`), `/chopchop` / `/nochop` consume a CHOP proposal, `/exfil` cleans up the workflow, or the session ends. `/sitrep` is sync-only and does **not** end the phase.

While in the recon phase:

- **In-phase follow-ups** — answer further questions about the OP, the codebase, or prior decisions. Read additional files on demand. No file writes, no `add-timeline`, no MCP push calls.
- **Wrong-phase requests** — if the user asks for work that belongs to a different skill, do **not** silently do it. Tell the user to run the proper skill and stop:
  - Drafting / revising `## SITUATION` → `/infil`
  - Drafting / revising `## MISSION` → `/warno`
  - Cutting tasks / editing `## EXECUTION` or `TASKS.md` → `/opord`
  - Implementing a task → `/splash`
  - Drafting a CHOP proposal → `/chop`
  - Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)

## Rules

- **Read-only**: no file writes, no `add-timeline`, no MCP push calls. Recon is for thinking and answering, nothing else.
- **Context load is OPERATION.md + TIMELINE.md only**: other files (`LOGS.yml`, other notes, codebase) are read on demand when a specific question warrants it.
- **No proactive research**: don't pre-walk the codebase or scan extra notes "just in case" — wait until a question makes the read necessary.
- **Stay passive**: if the user asks for work that belongs to another skill, route them to it instead of doing it.
- Print the readiness line as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
