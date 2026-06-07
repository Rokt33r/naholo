---
name: recon
description: Enter a read-only Q&A phase on the infiled OP — load OPERATION.md + TIMELINE.md, answer questions, no edits and no syncs.
argument-hint: '["first question"]'
---

# Recon — Read-Only Q&A

Drop into a passive Q&A phase on the active infiled OP. Loads `OPERATION.md` + `TIMELINE.md` as context, then answers questions about the OP. Writes nothing — no `OPERATION.md` edits, no `TASKS.md` edits, no codebase edits, no `add-timeline` bullets, no server syncs.

Use when the user wants to think out loud, audit prior decisions, or get the lay of the land without committing to a phase-changing skill. Re-running `/recon` re-loads context but is otherwise idempotent.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`.

Anything in quotes is an optional **first question**. When given, answer it after loading context. When omitted, load context and wait for the user's first question.

## What to do

### 1. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 2. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

### 3. Find infiled operation

Run `naholo agent op`. If it errors with "No infiled operation", tell the user to run `/infil {operationNumber}` first and stop. Otherwise capture the printed `#{operationNumber} {title}` for context.

### 4. Resolve operation directory

Run `naholo agent op-path` to get the absolute operation directory; call this `{operationDir}`.

### 5. Load context (only on a fresh session)

If you have not already read `{operationDir}/notes/OPERATION.md` in this session, read it now. If you already have it in context (e.g. an earlier skill in this session loaded it), skip the read — your existing context is authoritative.

If this is a fresh session (no prior turns in this conversation referencing the OP), also read `{operationDir}/notes/TIMELINE.md` for catch-up history. If the session is not fresh, **skip the TIMELINE read** — TIMELINE exists to bring a cold session up to speed, and your in-context conversation history already covers every event that has happened in this session.

Do **not** auto-load `LOGS.yml`, `TASKS.md`, other `notes/*.md`, or codebase files at this step — pull them on demand later only when a specific question warrants it.

### 6. Acknowledge readiness and answer

Print a one-line readiness signal as raw markdown (no surrounding fence):

```
Recon ready on OP #{operationNumber}: "{title}". Ask away.
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
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with the absolute path from `naholo agent op-path`.
