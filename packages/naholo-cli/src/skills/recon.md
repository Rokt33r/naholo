---
name: recon
description: Talk-it-out side branch — read OPERATION.md + TIMELINE.md, answer questions, shape the freeform args for the next /warno / /opord / /splash. Writes nothing.
argument-hint: '["first question"]'
---

# Recon — Talk it out before you fire a prompt

Half-cooked prompts make bad revisions. `/recon` is the talk-it-out side branch — the agent answers questions, pulls extra files on demand, and the conversation shapes the freeform args for the next skill. The agent never touches disk during recon; work the prompt out here, then fire the next skill once it's ready.

Two branches based on whether an op is infilled:

- **Infilled** — load `OPERATION.md` + `TIMELINE.md` up front, then answer with the loaded OP as context. The conversation shapes the freeform args for the next phase-changing skill (`/warno "..."` / `/opord "..."` / `/splash N "..."`).
- **No infilled op** — skip the OP context load and answer the question from the codebase alone (reading files on demand). If the question describes work the user would want to track as an operation, point them at `/fob "<title>\n<content>"` to create + infil. `/fob` follows the same run-command handoff as every other phase-changing skill (see Post-recon phase below): a run command invokes it; a bare description draws a push-back with drafted args.

Reach for it when:

- A Constraint in the WARNO sounds fishy or unsure after `/warno` — talk through the decision before keeping it, dropping it, or revising it.
- You want to revise a TASK or a shipped change but the right prompt isn't obvious yet — work out what to ask before you ask.
- You want to think out loud about a piece of the codebase before deciding whether it deserves its own OP.
- Any other moment your intent is unclear and you want to think out loud against the loaded OP context (or against the codebase, with no op infilled).

Re-running `/recon` re-loads context but is otherwise idempotent.

## Arguments

Anything in quotes is an optional **first question**. When given, answer it after loading context. When omitted, load context and wait for the user's first question.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}`.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

`<op_status>` either carries `currentOp` / `opTitle` / `opNotes` (infilled branch) or the literal `No infilled operation.` body (no-op branch). Both are valid `/recon` states — branch on which one shows up.

### 2. Load context (infilled branch only)

If an op is infilled, read these now:

- `{operationDir}/notes/OPERATION.md` — the live OP document; re-read every invocation so manual mid-session edits land
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that (it's a fresh-session catch-up doc, not in-session state)

If no op is infilled, skip this step — there is no `OPERATION.md` to load. The codebase is the only read surface on the no-op branch, and even those reads wait until step 3's question makes them necessary.

### 3. Acknowledge readiness and answer

Print a one-line readiness signal as raw markdown (no surrounding fence). Pick the line for the current branch:

- **Infilled** → `recon - OP #{currentOp}: {opTitle}\n`
- **No infilled op** → `recon - no OP infilled\n`

Then branch:

- **First-question arg provided** → answer it immediately. On the infilled branch, use the loaded OP context. On the no-op branch, answer from the codebase alone (read files on demand when the question needs them).
- **No arg** → stop after the readiness line and wait for the user's next message.

Subsequent user turns in the recon phase are questions to answer the same way — read on demand, answer, no writes.

When the conversation lands the prompt for a phase-changing skill, invoke that skill with the freeform args you and the user worked out — `/warno "..."`, `/opord "..."`, `/splash N "..."`. The next skill picks up where the conversation left off; `/recon` itself never writes the prompt or the resulting edit.

On the no-op branch, if the user's question describes work they would want to track as an operation (a fix, a feature, a refactor — something that would normally become its own OP), point them at `/fob "<title>\n<content>"` to create + infil. The run-command handoff applies: a run command for `/fob` invokes it via the `Skill` tool with the drafted args; a bare description of the work draws a draft-and-wait push-back — draft the title + content, stop, and let them re-fire (or confirm).

## Post-recon phase

Once this skill returns, the session is in the **recon** phase. The phase persists until a different phase-changing skill runs (`/infil`, `/warno`, `/opord`, `/splash`, `/chop`), `/chopchop` / `/nochop` consume a CHOP proposal, `/exfil` cleans up the workflow, or the session ends. `/sitrep` is sync-only and does **not** end the phase.

While in the recon phase:

- **In-phase follow-ups** — answer further questions about the OP (infilled branch), the codebase, or prior decisions. Read additional files on demand. No file writes, no `add-timeline`, no MCP push calls.
- **Wrong-phase requests** — branch on the user's speech act, not on whether a skill name merely appears:
  - **Run command** — execute the skill only when the user issues an imperative ("run opord", "go ahead with opord", "fire `/splash 4`"). The name counts whether `/`-prefixed, backticked, or bare, and one command may name several skills ("run warno and opord") → invoke each via the `Skill` tool, in the order given, with whatever args the recon conversation has shaped. No push-back.
  - **Mention, not a command** — the skill name sits in a subordinate / conditional clause, a comparison, or as the topic under discussion ("let's review before opord", "how does opord cut tasks?"). This is not an invocation → answer in the recon phase and run nothing.
  - **Phase-shaped work, no skill named** — the user describes the effect without naming a skill ("rewrite TASK 4 to handle nulls", "edit tasks"). Push back once: name the right slash command, **draft the freeform args string** for it, and stop — do not perform the work, do not invoke the skill yet. If their next message is a clear go-ahead on the drafted command ("yes", "run it"), that turn is the run command — invoke it.

  On the no-op branch, the only wrong-phase route is server-side OP creation (`/fob`); every other route below applies the moment an op is infilled:
  - Creating a new op (no infilled op) → `/fob`
  - Drafting / revising `## SITUATION` → `/infil`
  - Drafting / revising `## WARNING ORDER` → `/warno`
  - Cutting tasks / editing `## OPERATION ORDER` or `TASKS.md` → `/opord`
  - Implementing a task → `/splash`
  - Drafting a CHOP proposal → `/chop`
  - Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)

## Rules

- **Read-only**: no file writes, no `add-timeline`, no MCP push calls. Recon is for thinking and answering, nothing else.
- **Context load on the infilled branch is OPERATION.md + TIMELINE.md only**: other files (`LOGS.yml`, other notes, codebase) are read on demand when a specific question warrants it. On the no-op branch the codebase is the only read surface, and even those reads wait for a question that needs them.
- **No proactive research**: don't pre-walk the codebase or scan extra notes "just in case" — wait until a question makes the read necessary.
- **Invoke only on a run command**: a skill runs only when the user issues an imperative run command naming it ("run opord"; `/`-prefixed, backticked, or bare all count; several skills in one command run in turn). A skill name in any other role — a subordinate clause, a comparison, a topic of discussion — is a mention, not an invocation; stay in recon. Work described by its effect with no skill named draws a one-time push-back with drafted args. See Post-recon phase → Wrong-phase requests for the three cases. Never perform the target skill's work inline (no inline WARNO edits, no inline TASK edits, no inline code changes). The no-op `/fob` route follows the same rule.
- Print the readiness line as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
