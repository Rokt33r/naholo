# Naholo — AI-Assisted Development Workflow

Naholo connects idea capture (in the web app) to plan execution (in local repos with AI agents) via a core pipeline of skills — `/infil` → `/warno` → `/opord` → `/splash` → `/sitrep` → `/exfil` — plus a fresh-OP shortcut (`/raid`) that collapses `/warno` + `/opord` for small ops, an optional OP-splitting side branch (`/chop` → `/chopchop` or `/nochop`) usable from the warno or opord phase, and a read-only Q&A side branch (`/recon`) runnable from any post-infil state.

## Workflow

Each phase has a single document it mutates and a clear conceptual purpose. The skill is the verb; `OPERATION.md` is the noun. Everything else (TASKS.md, CHOP.md, the timeline, the server sync) is bookkeeping.

### Phase 1: Capture Ideas (Web App)

Create an operation in Naholo and collect context.

- **Logs** — quick thoughts, requirements, questions. Messenger-style, append-only, low-friction.
- **Notes** — structured reference material: designs, research, prior art. Tabbed markdown documents with autosave.

The web app is for thinking out loud. Once the OP has enough context to start, the user runs `/infil` locally.

### Phase 2: Infil (`/infil [N]`)

Bring an OP from the server to the local repo for offline-first work. Only one OP can be infiled at a time.

`/infil` creates a single live document, `OPERATION.md`, which has three top-level sections that get filled in over the lifetime of the OP:

- **`## SITUATION`** — the problem and any first-pass thoughts. Filled in by `/infil` from the OP's logs and notes; the user can edit it freely.
- **`## MISSION`** — the plan. Owned by `/warno`. Absent right after `/infil`.
- **`## EXECUTION`** — the per-task workspace. Owned by `/opord`. Absent right after `/infil`.

Re-running `/infil` with no args refreshes the local copy from the server and merges any divergent edits without clobbering local work.

### Phase 3: Warno (`/warno ["freeform"]`)

Write or modify `## MISSION` to lock in the architectural decisions.

- **`### Concept of Operations`** — two or three sentences summarizing the chosen approach. The high-level "what we're doing and why".
- **`### Warning Orders`** — one bullet per architectural decision. The "and here's how" expanded out, one decision at a time.
- **`### Target Reference Points`** — a curated list of files, folders, and glob patterns. For agents, not users — a fresh session uses TRP to locate the relevant code instead of re-walking the codebase from scratch.

A Warning Order may carry a sub-bullet of the form `- ? <prompt> (a / b) >` when `/warno` surfaces alternatives instead of committing. The user can resolve it by re-running `/warno "..."` with an answer, by hand-editing `OPERATION.md`, or by leaving it for `/opord` to collapse.

`/warno` with no args writes a fresh MISSION when none exists. To revise an existing MISSION, pass freeform args describing the change.

### Phase 3.5: Raid (`/raid ["freeform"]`) — fresh-OP shortcut

For small OPs where architecture review is overkill, `/raid` collapses Phase 3 and Phase 4 into a single invocation: it writes `## MISSION` inline (real Concept of Operations, real Target Reference Points, `### Warning Orders` body marked `_N/A_`), then chains `/opord` via the `Skill` tool to cut tasks and mirror `TASKS.md`.

`/raid` runs only on **fresh OPs** — `OPERATION.md` must have neither `## MISSION` nor `## EXECUTION` yet. Once any plan content exists, MISSION rewrites belong to `/warno` and plan revisions belong to `/opord`. Freeform args are forwarded verbatim to the chained `/opord` as task-cutting hints; like `/warno`, `/raid` falls back to the OP's title, `LOGS.yml`, and notes when invoked bare.

The session lands in the post-opord phase (declared by the chained `/opord`). If the operator later decides the OP deserves a real Warning Order list, `/warno "..."` upgrades the `_N/A_` stub into a real MISSION; the `raid` TIMELINE bullet remains as the durable signal that the original plan came from a raid.

### Phase 4: Opord (`/opord ["freeform"]`)

Cut the MISSION into single-commit-sized tasks under `## EXECUTION`. Each `### TASK N — {title}` section has:

- **`#### Intent`** — one or two sentences naming the success criterion. The bar a `/splash` session uses to know the task is done.
- **`#### Scheme of Maneuver`** _(optional)_ — an ASCII diagram of the new flow, a UI wireframe, or a before/after signature diff. Only when the change is visual or shape-changing enough that a diagram beats prose.
- **`#### Course of Action`** — the atomic action list a `/splash` session executes: Add / Edit / Move / Delete / Run / Manual steps.

`TASKS.md` mirrors the task list as a flat checkbox checklist for at-a-glance progress.

Re-running `/opord "..."` revises the plan: insert new tasks, drop unstarted ones, split, retitle, or rewrite. Already-shipped tasks (with an After-Action Report) are immutable; only unfinished tasks are touchable.

The bar for a finished `## EXECUTION` is: "could a fresh `/splash` session ship one task by reading only that task's section?"

### Phase 5: Splash (`/splash [N] ["freeform"]`)

Implement exactly one task per invocation.

`/splash` reads the task's Intent + Course of Action, writes the code, runs format + typecheck, then records what actually happened as an **`#### After-Action Report`** appended to the same task section — including any deviations from the planned Course of Action. The task's checkbox flips in `TASKS.md`, and the skill stops so the user can review the AAR before deciding whether to splash the next task.

Re-running `/splash N` on a shipped task overwrites the AAR — useful for follow-up tweaks where the original implementation needs adjustment.

### Side branch: OP-splitting (`/chop` → `/chopchop` or `/nochop`)

When one OP has grown to cover two distinct concerns, split it. CHOP — short for **Change of Operational Control**, the military term for transferring a unit between commanders — is a two-step proposal/apply flow plus a bail-out, available while in the warno or opord phase.

**`/chop "freeform"`** drafts the split as `notes/CHOP.md`: a side-by-side planning brief with a CURRENT OP block (what stays) and a NEW OP block (what gets carved off). Warning Orders and tasks appear as one-line summaries in each block. The user reviews and (optionally) hand-edits the doc.

**`/chopchop`** applies the proposal: spawns the new OP server-side seeded with the carved scope (SITUATION + MISSION + EXECUTION, including any After-Action Reports for shipped tasks that the user explicitly chose to move), prunes the same scope from the parent's `OPERATION.md` and `TASKS.md`, and deletes the planning brief.

**`/nochop`** discards the proposal without touching either OP — just deletes `CHOP.md`.

While `CHOP.md` exists, `/warno` / `/opord` / `/splash` remain runnable, but each warns the user that the change will desync the pending proposal so they can revise CHOP afterward (or cancel and resolve CHOP first).

### Side branch: Recon (`/recon ["first question"]`)

For thinking out loud or auditing prior decisions without committing to a phase-changing skill. `/recon` loads `OPERATION.md` + `TIMELINE.md` and drops the session into a passive Q&A phase — questions get answered, additional files (`LOGS.yml`, other notes, codebase) are pulled on demand. Writes nothing: no `OPERATION.md` edits, no `TASKS.md` edits, no `add-timeline` bullets, no server syncs.

Runnable from any post-`/infil` state. The recon phase persists until a phase-changing skill (`/warno`, `/opord`, `/splash`, `/chop`, `/chopchop`, `/nochop`) or `/exfil` runs; `/sitrep` is sync-only and leaves the recon phase intact. If the user asks for work that belongs to another skill mid-recon, `/recon` routes them to the right skill instead of doing it silently.

### Phase 6: Sync & Close

Two skills for different stages of the same operation.

**`/sitrep ["freeform"]`** — mid-session checkpoint. Pushes local tasks and notes to the server and posts a short summary log. The local infiled directory stays intact for continued work.

**`/exfil ["close"|"don't close"]`** — final sync and cleanup. Same push as sitrep, then optionally closes the operation, then deletes the local infiled directory. Run when the OP is done (or paused indefinitely) and the user wants to free the single-infil slot for another OP.

## Post-skill phase

Once a phase-changing skill returns, the session stays in that skill's **phase** until a different phase-changing skill runs (`/infil`, `/warno`, `/opord`, `/splash`, `/chop`), `/chopchop` or `/nochop` consume the CHOP proposal, `/exfil` cleans up the workflow, or the session ends. `/sitrep` is a sync-only operation and does **not** end the phase. The phase is the basis for two rules:

- **In-phase follow-up edits** — if the user asks for a change that belongs to the current phase (a MISSION tweak after `/warno`, a plan revision after `/opord`, an AAR edit or late-discovered deviation after `/splash`, a SITUATION fix after `/infil`, a CHOP proposal revision after `/chop`), the agent applies it and fires `naholo agent add-timeline -T <stage> '<summary>'` so a future fresh session sees what changed. The CLI owns timestamp + bullet format.
- **Wrong-phase requests** — if the user asks for work that belongs to a different skill (e.g. they're in the `splash` phase and ask to rewrite MISSION), the agent does **not** silently do it. It tells the user to run the proper skill (`/warno`, `/opord`, etc.) and stops. The one exception is the chop phase: `/warno`, `/opord`, and `/splash` are runnable while `CHOP.md` exists, but they each prompt the user via `AskUserQuestion` first since their edits will desync the pending proposal.

`/infil`, `/warno`, `/opord`, `/splash`, and `/chop` own a meaningful post-skill phase; `/chopchop` and `/nochop` end the chop phase by consuming `CHOP.md`; `/sitrep` and `/exfil` are pure sync operations and have nothing to anchor a phase to.

## Argument conventions

Only `/infil` takes the operation number, and only on a fresh infil. Every other skill resolves the active operation via `naholo agent op` (which reads `op.yml` and prints `#{N} {title}`).

| Skill       | First arg shape                | Meaning                                                                                                                                   |
| ----------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `/infil`    | `{N}` or none                  | Op number for fresh infil; no args to re-infil (refresh)                                                                                  |
| `/warno`    | `"freeform"` (optional)        | MISSION-scoped instructions to revise Concept / WARNORDs                                                                                  |
| `/raid`     | `"freeform"` (optional)        | Task-cutting hints forwarded to the chained `/opord` (fresh OPs only)                                                                     |
| `/opord`    | `"freeform"` (optional)        | Plan-revision instructions for unfinished tasks (insert / split / retitle / drop)                                                         |
| `/splash`   | `N` or `"freeform"` (optional) | Task number; or extra context for the next-unchecked task                                                                                 |
| `/chop`     | `"freeform"` (**required**)    | What to carve off (topic, WO references, optional new-OP title). Required in both fresh and revision modes — `/chop` with no args errors. |
| `/chopchop` | none                           | Consumes `notes/CHOP.md`. The only customization channel is hand-editing `CHOP.md` (or re-running `/chop "freeform"`) before applying.    |
| `/nochop`   | none                           | Discards `notes/CHOP.md`. No customization.                                                                                               |
| `/sitrep`   | `"freeform"` (optional)        | Extra context for the summary log                                                                                                         |
| `/exfil`    | `"freeform"` (optional)        | Common values: `"close"`, `"don't close"`                                                                                                 |
| `/recon`    | `"freeform"` (optional)        | Optional first question; without it, `/recon` loads context and waits                                                                     |

## Key Files

| File           | Role                                                                                                                                                                                                                                                                                  | Owned by                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPERATION.md` | Single live document — SITUATION, MISSION, EXECUTION (with per-task Intent, Scheme of Maneuver, Course of Action, AAR)                                                                                                                                                                | `/infil` creates SITUATION, `/warno` adds MISSION, `/opord` adds EXECUTION, `/splash` adds AARs, `/chopchop` prunes the carved scope                                                                                 |
| `TASKS.md`     | Flat checkbox list mirroring the EXECUTION TASK headings                                                                                                                                                                                                                              | `/opord` structures + inserts, `/splash` checks off, `/chopchop` deletes carved lines                                                                                                                                |
| `TIMELINE.md`  | Chronological catch-up log for fresh sessions that lack in-context history; pushed as just-another-note                                                                                                                                                                               | `naholo agent add-timeline` (invoked by each skill, plus by post-skill in-phase edits)                                                                                                                               |
| `CHOP.md`      | OP-splitting planning brief: `## Intent` + side-by-side `# CURRENT OP` / `# NEW OP` blocks (Concept of Operations, Warning Orders, EXECUTION checklist). Syncs to the parent OP as a regular note via `/sitrep` and `/exfil`, so a teammate or fresh session can resume the proposal. | `/chop` creates/revises, `/chopchop` consumes + deletes both local and server-side on apply, `/nochop` deletes both on discard. Hand-editing between `/chop` and `/chopchop` is the supported customization channel. |

## MCP Integration

| Tool                   | Used by                | Purpose                                                                                                          |
| ---------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `create_operation_log` | `/sitrep`, `/exfil`    | Post summary log entries                                                                                         |
| `close_operation`      | `/exfil`               | Close a completed operation                                                                                      |
| `create_operation`     | `/chopchop`            | Spawn the new OP server-side when applying a CHOP proposal                                                       |
| `create_note`          | `/chopchop`            | Push the new OP's seeded `OPERATION.md` (SITUATION + carved MISSION + carved EXECUTION)                          |
| `create_task`          | `/chopchop`            | Push each carved task to the new OP (position assigned from `CHOP.md`'s NEW OP order, renumbered from 1)         |
| `update_task`          | `/chopchop`            | Flip `done: true` for any `- [x]` shipped task carried over to the new OP so the server checkbox matches the AAR |
| `delete_note`          | `/chopchop`, `/nochop` | Remove the parent OP's server-side `CHOP` note after applying or discarding the proposal                         |

Task and note syncing flows through the `naholo agent infil` / `naholo agent reinfil` / `naholo agent sitrep` / `naholo agent exfil` CLI rather than direct MCP calls, so skills don't manage `.base/` baselines or per-entity MCP tools by hand. The CLI treats `notes/*.md` as opaque markdown — `OPERATION.md`, `TIMELINE.md`, `CHOP.md`, and any free-form notes all sync the same way. `/chopchop` and `/nochop` are the skills that call MCP tools directly for write operations, since the new OP exists only after `create_operation` returns its assigned number and the parent's `CHOP` note has to disappear before `/sitrep` would otherwise re-push it.
