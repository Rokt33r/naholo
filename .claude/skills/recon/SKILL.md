---
name: recon
description: Talk-it-out side branch — read OPERATION.md + TIMELINE.md, answer questions, shape the freeform args for the next /warno / /opord / /splash. Writes nothing.
argument-hint: '["first question"]'
---

# Recon — Talk it out before you fire a prompt

Half-cooked prompts make bad revisions. `/recon` is the talk-it-out side branch — the agent answers questions, pulls extra files on demand, and the conversation shapes the freeform args for the next skill. The agent never touches disk during recon; work the prompt out here, then fire the next skill once it's ready.

Two branches based on whether an op is infiled:

- **Infiled** — load `OPERATION.md` + `TIMELINE.md` up front, then answer with the loaded OP as context. The conversation shapes the freeform args for the next phase-changing skill (`/warno "..."` / `/opord "..."` / `/splash N "..."`).
- **No infiled op** — skip the OP context load and answer the question from the codebase alone (reading files on demand). If the question describes work the user would want to track as an operation, point them at `/fob "<title>\n<content>"` to create + infil. `/fob` follows the same two-mode handoff as every other phase-changing skill (see Post-recon phase below): if the user names it, invoke; if they only describe it, push back once and draft the args.

Reach for it when:

- A Constraint in the WARNO sounds fishy or unsure after `/warno` — talk through the decision before keeping it, dropping it, or revising it.
- You want to revise a TASK or a shipped change but the right prompt isn't obvious yet — work out what to ask before you ask.
- You want to think out loud about a piece of the codebase before deciding whether it deserves its own OP.
- Any other moment your intent is unclear and you want to think out loud against the loaded OP context (or against the codebase, with no op infiled).

Re-running `/recon` re-loads context but is otherwise idempotent.

## Arguments

Anything in quotes is an optional **first question**. When given, answer it after loading context. When omitted, load context and wait for the user's first question.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}`.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

`<op_status>` either carries `currentOp` / `opTitle` / `opNotes` (infiled branch) or the literal `No infiled operation.` body (no-op branch). Both are valid `/recon` states — branch on which one shows up.

### 2. Load context (infiled branch only)

If an op is infiled, read these now:

- `{operationDir}/notes/OPERATION.md` — the live OP document; re-read every invocation so manual mid-session edits land
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that (it's a fresh-session catch-up doc, not in-session state)

If no op is infiled, skip this step — there is no `OPERATION.md` to load. The codebase is the only read surface on the no-op branch, and even those reads wait until step 3's question makes them necessary.

### 3. Acknowledge readiness and answer

Print a one-line readiness signal as raw markdown (no surrounding fence). Pick the line for the current branch:

- **Infiled** → `recon - OP #{currentOp}: {opTitle}\n`
- **No infiled op** → `recon - no OP infiled\n`

Then branch:

- **First-question arg provided** → answer it immediately. On the infiled branch, use the loaded OP context. On the no-op branch, answer from the codebase alone (read files on demand when the question needs them).
- **No arg** → stop after the readiness line and wait for the user's next message.

Subsequent user turns in the recon phase are questions to answer the same way — read on demand, answer, no writes.

When the conversation lands the prompt for a phase-changing skill, invoke that skill with the freeform args you and the user worked out — `/warno "..."`, `/opord "..."`, `/splash N "..."`. The next skill picks up where the conversation left off; `/recon` itself never writes the prompt or the resulting edit.

On the no-op branch, if the user's question describes work they would want to track as an operation (a fix, a feature, a refactor — something that would normally become its own OP), point them at `/fob "<title>\n<content>"` to create + infil. The two-mode handoff applies: if the user names `/fob`, invoke it via the `Skill` tool with the drafted args; if they only describe the work, draft the title + content for them, stop, and let them re-fire (or confirm).

## Post-recon phase

Once this skill returns, the session is in the **recon** phase. The phase persists until a different phase-changing skill runs (`/infil`, `/warno`, `/opord`, `/splash`, `/chop`), `/chopchop` / `/nochop` consume a CHOP proposal, `/exfil` cleans up the workflow, or the session ends. `/sitrep` is sync-only and does **not** end the phase.

While in the recon phase:

- **In-phase follow-ups** — answer further questions about the OP (infiled branch), the codebase, or prior decisions. Read additional files on demand. No file writes, no `add-timeline`, no MCP push calls.
- **Wrong-phase requests** — two cases, branch by whether the user named the target skill:
  - **Named the skill** ("run opord", "fire `/splash 4`", "do a warno to swap Constraint 2", "go ahead with opord") → treat it as an explicit invocation. Skill names count whether prefixed with `/`, wrapped in backticks, or written bare. Invoke that skill via the `Skill` tool with whatever args the recon conversation has shaped. No push-back, no draft-and-wait step.
  - **Described phase-shaped work without naming the skill** ("rewrite TASK 4 to handle nulls", "WARNO should pivot to a queue") → push back once. Do **not** perform the work yourself, do **not** invoke the target skill yet. Name the right slash command and **draft the freeform args string** for it based on what the user just said, then stop. The user re-fires the command (with edits if they want) and the next skill picks it up. If their next message is a clear go-ahead on the drafted command ("yes", "looks good, run it"), invoke the skill from that turn — the drafted prompt is the explicit invocation.

  On the no-op branch, the only wrong-phase route is server-side OP creation (`/fob`); every other route below applies the moment an op is infiled:
  - Creating a new op (no infiled op) → `/fob`
  - Drafting / revising `## SITUATION` → `/infil`
  - Drafting / revising `## WARNING ORDER` → `/warno`
  - Cutting tasks / editing `## OPERATION ORDER` or `TASKS.md` → `/opord`
  - Implementing a task → `/splash`
  - Drafting a CHOP proposal → `/chop`
  - Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)

## Rules

- **Read-only**: no file writes, no `add-timeline`, no MCP push calls. Recon is for thinking and answering, nothing else.
- **Context load on the infiled branch is OPERATION.md + TIMELINE.md only**: other files (`LOGS.yml`, other notes, codebase) are read on demand when a specific question warrants it. On the no-op branch the codebase is the only read surface, and even those reads wait for a question that needs them.
- **No proactive research**: don't pre-walk the codebase or scan extra notes "just in case" — wait until a question makes the read necessary.
- **Two-mode handoff**: if the user names the target skill (`/opord`, `` `opord` ``, or bare `opord` all count), invoke it via the `Skill` tool with the conversation's args. If the user only describes phase-shaped work without naming the skill, push back once: name the right slash command, draft the freeform args from their description, and stop — the user re-fires it (or confirms the draft) in their own turn. Never perform the target skill's work inline (no inline WARNO edits, no inline TASK edits, no inline code changes). The no-op `/fob` route follows the same rule.
- Print the readiness line as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
