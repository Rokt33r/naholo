---
name: opord
description: Cut a warno'd Naholo operation's MISSION into ORP-sized tasks — write EXECUTION in OPERATION.md, mirror to TASKS.md.
argument-hint: '["freeform plan-revision instructions"]'
---

# Opord — Cut the Mission into Tasks

OPORD-style detail-cutter. Reads `## MISSION` (must already be populated by `/warno`), resolves any unanswered Warning Order alternatives, cuts the mission into ORP-sized tasks, **appends `## EXECUTION`** to `OPERATION.md` when absent (revises in place when present), and mirrors the task list into `TASKS.md` as a flat checkbox list.

The skill name is the unambiguous "where are we" signal: re-running `/opord` is for any plan adjustment — split / merge / retitle / insert / drop / rewrite unfinished tasks, all the way up to a full restart. Direction changes — Concept of Operations rewrites, Warning Order revisions — belong to `/warno`, not `/opord`.

Each task is sized for one reviewable `/splash`; sub-tasks are deliberately not used. The bar is "could a fresh `/splash` session ship one task by reading only that task's section in OPERATION.md and the project conventions?"

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`.

Anything passed as an argument is treated as **freeform instructions** describing how to revise EXECUTION. There is no keyword list — read the instructions like any other prompt and classify the intent in step 8 (re-run dispatch). Common patterns:

- `/opord` (no args) — first run after `/warno`, or resume a partial EXECUTION draft.
- `/opord "split TASK 3 into two — one for the schema, one for the migration"` — targeted edit.
- `/opord "add a task to backfill the migration script"` — single insertion.
- `/opord "drop TASK 7, rewrite TASK 4 to cover both routes"` — multi-task revision.
- `/opord "rewrite EXECUTION from scratch"` — full restart of unfinished tasks.

With `## EXECUTION` already present, the default assumption is that the freeform args are plan-revision instructions (insert / drop / split / merge / retitle / rewrite unfinished tasks). MISSION-shaped instructions (Concept of Operations rewrite, Warning Order changes) belong to `/warno`, not `/opord`.

## What to do

### 1. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 2. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

### 3. Find infiled operation

Run `naholo agent op`. If it errors with "No infiled operation", tell the user to run `/infil {operationNumber}` first and abort. Otherwise capture the printed `#{operationNumber} {title}` for context.

### 4. Resolve operation directory

Run `naholo agent op-path` to get the absolute operation directory; call this `{operationDir}`. All file paths in this skill compose on top of it.

### 5. Read local state

Read if you haven't read:

- `{operationDir}/TASKS.md`
- `{operationDir}/notes/OPERATION.md`

If MISSION includes a `### Target Reference Points` subsection, treat it as the canonical map of what `/warno` already researched. In a fresh session, prefer reading those listed paths over re-walking the codebase from scratch — TRP exists precisely so `/opord` doesn't redo the discovery work.

### 6. Validate MISSION

`## MISSION` must already be populated. If MISSION is absent (no `## MISSION` heading) or missing any of the two required subsections (`### Concept of Operations`, `### Warning Orders`), stop and tell the user to run `/warno` first. `/opord` is the OPORD pass — without a populated MISSION it has nothing to cut.

`### Target Reference Points` is optional — its absence is not a validation failure. If it's missing, `/opord` proceeds normally (and may have to research the codebase itself).

### 7. Resolve Warning Order alternatives

For each `### Warning Orders` bullet that has a `- ? <prompt> (opt-a / opt-b) >` sub-bullet, resolve it in place:

- **No answer written** (nothing after the trailing `>`) → replace the `- ? ...` sub-bullet with `- Rejected: opt-a, opt-b`. The bold-label chosen path stays as-is. If a `- Rejected:` already exists on the WO, merge into it (comma-join).
- **User wrote an answer matching one of the listed options** → rewrite the WO's bold label to commit to that option, then replace the sub-bullet with `- Rejected: <original chosen + remaining alts>`.
- **User wrote a free-form answer** (something not in the listed options) → rewrite the bold label to that answer, replace the sub-bullet with `- Rejected: opt-a, opt-b`.

No reasons on rejected items unless the user wrote them in. When in doubt, treat the answer as empty and collapse to Rejected.

### 8. Re-run dispatch + write EXECUTION

Inspect the current state of `## EXECUTION` and any freeform args. Branch:

- **EXECUTION absent (no `## EXECUTION` heading), no args** → fresh write. Append `## EXECUTION` after the last MISSION content, then cut MISSION into ORP-sized tasks and populate EXECUTION (one `### TASK N — Title` per task). Mirror to `TASKS.md` (step 10). Run `naholo agent add-timeline -T opord 'Drafted N tasks.'`.
- **EXECUTION present, no args** → stop. The skill cannot tell whether the existing task list is finished or still in progress, and silently rewriting it risks clobbering committed scope. Tell the user to either re-run with freeform args describing the change (`/opord "…"`) or delete the `## EXECUTION` section from `OPERATION.md` (and clear `TASKS.md` accordingly) and re-run `/opord` for a fresh write. Do not modify EXECUTION, do not touch TASKS.md, do not append a TIMELINE bullet.
- **Args provided, classify intent**:
  - **Targeted edit** — args describe partial changes to specific unfinished tasks (split, merge, retitle, swap Course of Action steps). Apply the described edits in place. Run `naholo agent add-timeline -T opord '{summary}'`.
  - **Insertion** — args describe adding one or more new tasks. Append the new `### TASK N — Title` sections at the next free integer after the last existing task (do **not** renumber or re-slot existing tasks, finished or unfinished). If the user names a position ("after TASK 3"), still write the section at the end of EXECUTION and trust `/splash` order to be driven by the integer order in `TASKS.md` — keep numbering monotonic. Run `naholo agent add-timeline -T opord '{summary}'`.
  - **Multi-task revision** — args describe removing or rewriting multiple unfinished tasks at once. Apply the described edits; renumber subsequent unfinished tasks as needed. Never delete or rewrite a task whose `#### After-Action Report` heading is present. Run `naholo agent add-timeline -T opord '{summary}'`.
  - **Full restart** — args explicitly say start over (e.g., "rewrite EXECUTION from scratch"). Confirm with `AskUserQuestion` that the user really wants this. If they do, rewrite EXECUTION and renew all tasks even finished. Run `naholo agent add-timeline -T opord '{summary}'`.

### 9. Write OPERATION.md EXECUTION

One `### TASK N — Title` subsection per task, in order. Each task section has three subsections — **`#### Intent`**, **`#### Scheme of Maneuver`** (optional), and **`#### Course of Action`** — in that order.

- `#### Intent` — one sentence, ≤ ~25 words, naming the **approach** this task takes at the level a PR title would name it. Prose, not a spec. No code fences, no column lists, no signatures, no DDL, no verification clauses (`pnpm test-types` is green, etc. — implicit from COA). Backtick a symbol/path/filename only when it _is_ the subject of the headline (the thing being added, slimmed, renamed); skip backticks for incidental mentions. Intent is the skim-anchor — concrete shapes are reviewed in SOM, concrete steps in COA. Examples:

  ```
  #### Intent

  Add an env-selected storage adapter with S3 and local-FS drivers so later tasks can write blobs without knowing where they land.
  ```

  ```
  #### Intent

  Swap the agent-session schema from inline transcript columns to a `has_transcript` flag and move transcript writes into the record endpoint via the storage adapter.
  ```

  ```
  #### Intent

  Slim `stats-record` to a `sessions.yml` upsert; transport moves out of the Stop hook entirely.
  ```

- `#### Scheme of Maneuver` (optional, but **required** when the task introduces or modifies control flow, request lifecycle, UI layout, symbol/path signatures, **DB schema (table column lists), DTOs, or API request/response shapes**). The Intent must stay a one-or-two-sentence success criterion — if the task ships a structure (columns, fields, signature), the structure goes here, not in the Goal. Use code-fenced ASCII for visual artifacts:
  - **Control flow**: a box-and-arrow diagram (or a sequence-style listing) showing the order of operations and decision branches. Untagged fence.
  - **UI**: a wireframe-style ASCII sketch showing the screen regions, key elements, and interactions. Untagged fence.
  - **Schema layout**: a fenced block listing each column with its type, constraints, and FK relationships (one column per line). Tag with `sql` if you're writing literal DDL; otherwise leave the fence untagged.
  - **Signature changes / before-after layouts, DTOs, API shapes, public function signatures**: pick the fence tag in this priority order so code editors and markdown renderers syntax-highlight it correctly:
    1. **The language the symbols actually live in** (preferred — e.g., `ts` for a `NaholoClient.recordAgentSession` signature, `py` for a Python service method, `rs` for a Rust function).
    2. **The project's primary language** (backup — use when the task spans the project broadly and no single file owns the symbol).
    3. **Pseudo-code, last resort** (when neither of the above applies — e.g., a cross-language design sketch). Write it in TypeScript-ish syntax inside an **untagged** fence so renderers don't misclassify it.

    Use real exported symbol names when the type/class will exist in code (`AgentSessionPayload`, `NaholoClient`, etc.). When the shape is anonymous in code (e.g., an inline request body object literal in a route handler with no exported type), use a placeholder name prefixed `sample_` in snake*case (`sample_request_body`, `sample_response_body`, `sample_hook_payload`) so the reader knows the name itself is illustrative, not a symbol to grep for. The `sample*\*` convention applies regardless of the chosen language.

  - **Linear / trivially simple flow**: a numbered list is acceptable instead of a diagram.

  Example (control flow):

  ```
  request ── has session? ─┬─yes──► load user ──► handler
                           └─no───► 401
  ```

  Example (signature diff — real symbols in a TS project, `ts` fence):

  ```ts
  // before → after, in local-operations.ts
  function getLocalOperationDir(opNum: number): string  →  function getLocalOperationDir(): string
  function getNotesDir(opNum: number): string           →  function getNotesDir(): string
  function readOpYml(): { number: number; title: string }   // new
  function writeOpYml(op: { number: number; title: string }): void   // new
  ```

  Example (schema layout — untagged fence):

  ```
  operation_agent_sessions
    id                    uuid pk
    operation_id          uuid → operations.id (cascade)
    session_id            text unique
    ai_title              text nullable
    started_at            timestamp
    ...
  ```

  Example (anonymous DTO / API shape — `sample_*` placeholders, fence tagged with the project's primary language):

  ```ts
  type sample_request_body = {
    sessionId: string
    aiTitle: string | null
    transcript: string | null // null when truncated
    // ...
  }

  type sample_response_body = { id: string }
  ```

  Example (public function signature — real exported symbols, `ts` fence):

  ```ts
  class NaholoClient {
    recordAgentSession(
      projectSlug: string,
      operationNumber: number,
      payload: AgentSessionPayload,
    ): Promise<{ id: string }>
  }

  type AgentSessionPayload = {
    sessionId: string
    aiTitle: string | null
    // ...
  }
  ```

  Skip this section entirely if the task is a pure data/logic change with no flow, UI, or signature implications.

- `#### Course of Action` — the atomic steps that ship this task. Each item is one of six verbs:
  - `Add {path}` — one-line purpose
  - `Edit {path}` — one-line description of what changes
  - `Move {oldPath} → {newPath}` — one-line description (e.g. "rename for clarity", "relocate into shared lib"). Use `→` (Unicode arrow). Sub-bullets only when symbols' signatures change as part of the move; pure relocations get no sub-bullets.
  - `Delete {path}` — one-line reason
  - `` Run `{command}` `` — one-line purpose (migrations, rebuilds, etc.)
  - `Manual: {action}` — one-line description of what the user must do (verify in browser, run a command the agent must not run, paste a secret, etc.). `/splash` pauses on these and asks the user to confirm completion before continuing.

  Sub-bullets (only under `Add` / `Edit` / `Move`) name **top-level exported symbols**, one-liner per sub-bullet. List every changed export, even when the file exports a single thing (e.g. a Commander subcommand module). Do NOT list internal helpers, private functions, or per-line code descriptions. Omit sub-bullets entirely on `Delete` / `Run` / `Manual`, on `Edit` items where no exported symbol is meaningfully changed (e.g. a registration-only edit), and on `Move` items that are pure relocations.

  Example:

  ```
  - Edit packages/naholo-cli/src/lib/local-operations.ts
    - `getLocalOperationDir`, `getNotesDir`, `getBaseDir`, `getTasksPath`,
      `getBaseTasksPath`, `getBaseNotesDir`: drop the `operationNumber` arg
    - `readOpYml`, `writeOpYml`: new — read/write `op.yml` at the infiled root
  - Add packages/naholo-cli/src/commands/agent/infil.ts
    - `infil` subcommand: writes op.yml and pulls data
  - Move packages/naholo-cli/src/lib/local-operations.ts → packages/naholo-cli/src/lib/infiled.ts — rename now that "operations" plural is gone
  - Delete packages/naholo-cli/src/commands/agent/op-list.ts — superseded by `op`
  - Run `mv .naholo/local/operations/122 .naholo/local/infiled` — migrate this op's data
  - Manual: run `pnpm db:migrate` after the schema edit lands (CLAUDE.md forbids the agent from running it)
  ```

  Include all steps you can predict; `/splash` may add files in its AAR if it discovers more.

  Do **not** list general post-edit verification commands (formatters, type checkers, etc.) that already live in `CLAUDE.md` or `.claude/rules/` — `/splash` reads those rules and runs the verifications itself. COA should only carry steps that are specific to this task. Project-owned actions the agent must not run (e.g. database migrations) still belong on the COA as `Manual: {action}` so `/splash` surfaces them.

`/opord`'s per-task template ends at `#### Course of Action`. Do **not** write a `#### After-Action Report` heading or body — `/splash` adds the heading + body when it ships the task.

ORP sizing rules:

- Each task should be a chunk a reviewer can read and understand in a few minutes after `/splash` ships it.
- **Intent is the approach summary only.** Concrete shapes live in SOM, concrete steps live in COA — Intent must stay a single skim-readable headline.
- No sub-tasks. If a chunk feels like it needs sub-bullets, split it into two top-level tasks. (Course of Action sub-bullets are not sub-tasks — they're per-symbol annotations on a single step.)
- Tasks are ordered for shipping — top-to-bottom is the default `/splash` order.
- An intent that says "do A or B" is a bug — pick one and explain the reasoning in MISSION's Warning Orders (or ask `/warno` to add the decision if it's missing).

### 10. Mirror to TASKS.md

Sync `TASKS.md` to match the EXECUTION task list:

- Heading stays `# TASKS — OP #{n}`.
- One `- [ ] N. Title` line per `### TASK N — Title`, in order. Flat — no indentation, no sub-bullets.
- Preserve existing `[ref](naholo://tasks/{id})` links and `[x]` done states for tasks that are still present.
- Add new tasks as `- [ ]`. Remove deleted tasks (only if they have no `#### After-Action Report` heading — never remove a shipped task).
- Renumber as needed; keep titles synced with the task headings.

### 11. Print summary

Show the plan state. Use markdown link syntax. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

Plan complete for OP #42: "Implement user auth"

- Tasks: 6 total (0 done, 6 remaining)
- Execution: [EXECUTION]({operationDir}/notes/OPERATION.md#L<line>)
- Tasks: [TASKS.md]({operationDir}/TASKS.md)

Resolve `<line>` by reading back `OPERATION.md` after writing EXECUTION and locating the `## EXECUTION` heading. The link label stays semantic per the manual's `## Chat output` → `### Link format` rule — no `#L<line>` in the label.

Next:

- Looks good → run `/splash` to ship TASK 1
- Plan adjustment (insert, drop, split, retitle, rewrite unfinished tasks) → re-run `/opord "freeform instructions"` or edit EXECUTION directly
- Direction change → re-run `/warno "freeform instructions"` to revise MISSION
- Optionally → `/sitrep` to push current plan to the server

## Post-opord phase

Once this skill returns, the session is in the **opord** phase. The phase persists until a different skill runs or the session ends.

While in the opord phase:

- **In-phase follow-up edits** — any plan-revision the user asks for on **unfinished** tasks (insert / drop / split / merge / retitle / rewrite Course of Action steps, refresh `TASKS.md` to match) is part of this phase. Apply the edit and fire a single `naholo agent add-timeline -T opord '<summary>'` per discrete event so a future fresh session sees what changed. Completed tasks (those with a `#### After-Action Report` heading) remain immutable.
- **Wrong-phase requests** — if the user asks for work that belongs to a different skill, do **not** silently do it. Tell the user to run the proper skill and stop:
  - MISSION rewrite (Concept of Operations / Warning Orders / Target Reference Points) → `/warno`
  - Implementing a task → `/splash`
  - Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)

## Rules

- **EXECUTION-only**: `/opord` writes (or revises) `## EXECUTION` and mirrors to `TASKS.md`. It does NOT touch `## MISSION` — direction changes belong to `/warno`.
- **MISSION must exist**: abort with a "run `/warno` first" message if MISSION is absent or missing required subsections.
- **No sub-tasks**: every task is flat. If you feel the urge to sub-bullet, split into two tasks.
- **Completed tasks are immutable**: a task with a `#### After-Action Report` heading MUST NOT be edited, renumbered, or removed.
- **Decisions commit to one path**: every task Intent headline names the chosen approach. "Pick A or B" phrasing is a bug — redraft, or ask `/warno` to add the missing Warning Order.
- **Preserve `[ref]` links** in TASKS.md.
- **Respect existing done states**: don't uncheck `[x]` items in TASKS.md.
- **OPERATION.md has exactly three top-level sections**: SITUATION, MISSION, EXECUTION. Nothing else. Per-task progress lives in EXECUTION's AARs; chronological events live in TIMELINE.md.
- **Rejected sub-bullets**: comma-join alternatives, no reasons unless the user added them.
- **New tasks append at the next free integer**: never letter-suffix, never re-slot existing tasks. The numbering is plain `TASK 1`, `TASK 2`, …. (Historical letter-suffix tasks from before this doctrine — e.g. `TASK 3a` — stay as-is; they're immutable AAR records.)
- **Do NOT implement any code** — only edit `OPERATION.md` and `TASKS.md`; TIMELINE.md is updated via `naholo agent add-timeline`.
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with the absolute path from `naholo agent op-path`.
