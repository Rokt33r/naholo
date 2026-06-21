---
name: opord
description: Cut a warno'd Naholo operation's WARNING ORDER into single-commit-sized tasks — write OPERATION ORDER in OPERATION.md, mirror to TASKS.md.
argument-hint: '["freeform plan-revision instructions"]'
---

# Opord — Cut the Warning Order into Tasks

OPORD-style detail-cutter. Reads `## WARNING ORDER` (must already be populated by `/warno`), resolves any unanswered Constraint alternatives, cuts the WARNO into single-commit-sized tasks, **appends `## OPERATION ORDER`** to `OPERATION.md` when absent (revises in place when present), and mirrors the task list into `TASKS.md` as a flat checkbox list.

`OPERATION.md` is a container holding the orders successively issued for one op: `## SITUATION` is shared context, `## WARNING ORDER` is the WARNO document (preliminary direction owned by `/warno`), `## OPERATION ORDER` is the OPORD document (the full task-cut plan owned by `/opord`). Re-running `/opord` is for any plan adjustment — split / merge / retitle / insert / drop / rewrite unfinished tasks, all the way up to a full restart. Direction changes — Concept of Operations rewrites, Constraint revisions — belong to `/warno`, not `/opord`.

Each task is sized for one reviewable `/splash`; sub-tasks are deliberately not used. The bar is "could a fresh `/splash` session ship one task by reading only that task's section in OPERATION.md and the project conventions?"

## Arguments

Anything passed as an argument is treated as **freeform instructions** describing how to revise OPERATION ORDER. There is no keyword list — read the instructions like any other prompt. First check them against `## Wrong-intent pushback`: if they ask for work another skill owns, push back and stop; otherwise classify the in-scope intent in step 6 (re-run dispatch). Common patterns:

- `/opord` (no args) — first run after `/warno`, or resume a partial OPERATION ORDER draft.
- `/opord "split TASK 3 into two — one for the schema, one for the migration"` — targeted edit.
- `/opord "add a task to backfill the migration script"` — single insertion.
- `/opord "drop TASK 7, rewrite TASK 4 to cover both routes"` — multi-task revision.
- `/opord "rewrite OPORD from scratch"` — full restart of unfinished tasks.

With `## OPERATION ORDER` already present, the default assumption is that the freeform args are plan-revision instructions (insert / drop / split / merge / retitle / rewrite unfinished tasks). WARNO-shaped instructions (Concept of Operations rewrite, Constraint changes) belong to `/warno`, not `/opord`.

## Wrong-intent pushback

`/opord` owns OPERATION ORDER and nothing else. Before acting on freeform args, classify their intent: if they ask for work `/opord` does not own, do **not** silently do it — name the owning skill, tell the user to run it, and stop. This routing is identical whether the wrong-intent prompt arrives as the args of a direct `/opord` call or as a follow-up request after the phase (see Post-opord phase):

- WARNO rewrite (Concept of Operations / Constraints / Target Reference Points) → `/warno`
- Implementing a task → `/splash`
- Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)

In-scope plan-revision work — insert / drop / split / merge / retitle / rewrite unfinished tasks — proceeds through the normal dispatch below.

## What to do

### 1. Boot

**If you haven't run `naholo agent boot` in this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>` as `{operationDir}` — every file path in this skill composes on top of it.

**If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status.

If `<op_status>` carries `No infilled operation.`, tell the user to run `/infil <opNum>` first and abort.

`<op_status>` carries `currentOp` / `opTitle` / `opNotes` — read from it whenever this skill needs them.

### 2. Load context

Read these now:

- `{operationDir}/notes/OPERATION.md` — the live OP document; re-read every invocation so manual mid-session edits land
- `{operationDir}/TASKS.md` — the checklist
- `{operationDir}/notes/TIMELINE.md` — **first session-boot only**; never re-read after that (it's a fresh-session catch-up doc, not in-session state)

If the WARNO includes a `### Target Reference Points` subsection, treat it as the canonical map of what `/warno` already researched. In a fresh session, prefer reading those listed paths over re-walking the codebase from scratch — TRP exists precisely so `/opord` doesn't redo the discovery work.

### 3. Pending CHOP gate

If step 1's `opNotes` contains the entry `CHOP`, the session is in the chop phase — a CHOP proposal is in flight. Before doing any other work (no codebase research, no file edits, no `add-timeline`), surface this gate so the user can decide whether to desync the proposal or resolve it first.

Call `AskUserQuestion` with:

- **question**: `"A CHOP proposal is pending at notes/CHOP.md — running /opord now will desync it from the parent OP. How do you want to proceed?"`
- **header**: `"CHOP pending"`
- **options** (labels only, no descriptions):
  1. `"Resolve CHOP first (Recommended)"`
  2. `"Proceed anyway"`

Branch on the answer:

- **Resolve CHOP first** → abort the skill immediately. Do not load codebase context, do not edit any file, do not call `add-timeline`. Print as raw markdown (no surrounding fence) and stop:

  > `/opord` cancelled. Pick one:
  >
  > - `/chop "freeform"` — continue editing [CHOP]({operationDir}/notes/CHOP.md)
  > - `/chopchop` — apply CHOP
  > - `/nochop` — abort and abandon CHOP

- **Proceed anyway** → continue with the skill's normal flow. On the end-of-skill summary (step 10), append this line as the final line:

  > _After `OPERATION.md` is settled, run `/chop "freeform"` to make [CHOP]({operationDir}/notes/CHOP.md) reflect the new state._

### 4. Validate WARNING ORDER

`## WARNING ORDER` must already be populated. If WARNING ORDER is absent (no `## WARNING ORDER` heading) or missing any of the two required subsections (`### Concept of Operations`, `### Constraints`), stop and tell the user to run `/warno` first. `/opord` is the OPORD pass — without a populated WARNO it has nothing to cut.

`### Target Reference Points` is optional — its absence is not a validation failure. If it's missing, `/opord` proceeds normally (and may have to research the codebase itself).

### 5. Resolve Constraint alternatives

For each `### Constraints` bullet that has a `- ? <prompt> (opt-a / opt-b) >` sub-bullet, resolve it in place:

- **No answer written** (nothing after the trailing `>`) → replace the `- ? ...` sub-bullet with `- Rejected: opt-a, opt-b`. The bold-label chosen path stays as-is. If a `- Rejected:` already exists on the Constraint, merge into it (comma-join).
- **User wrote an answer matching one of the listed options** → rewrite the Constraint's bold label to commit to that option, then replace the sub-bullet with `- Rejected: <original chosen + remaining alts>`.
- **User wrote a free-form answer** (something not in the listed options) → rewrite the bold label to that answer, replace the sub-bullet with `- Rejected: opt-a, opt-b`.

No reasons on rejected items unless the user wrote them in. When in doubt, treat the answer as empty and collapse to Rejected.

### 6. Re-run dispatch + write OPERATION ORDER

Inspect the current state of `## OPERATION ORDER` and any freeform args. Branch:

- **OPERATION ORDER absent (no `## OPERATION ORDER` heading), no args** → fresh write. Append `## OPERATION ORDER` after the last WARNING ORDER content, then cut the WARNO into single-commit-sized tasks and populate OPERATION ORDER (one `### TASK N — Title` per task). Mirror to `TASKS.md` (step 8).
- **OPERATION ORDER present, no args** → stop. The skill cannot tell whether the existing task list is finished or still in progress, and silently rewriting it risks clobbering committed scope. Tell the user to either re-run with freeform args describing the change (`/opord "…"`) or delete the `## OPERATION ORDER` section from `OPERATION.md` (and clear `TASKS.md` accordingly) and re-run `/opord` for a fresh write. Do not modify OPERATION ORDER, do not touch TASKS.md, do not append a TIMELINE bullet.
- **Args provided** → first run them through `## Wrong-intent pushback`: if the intent belongs to another skill, name the owner and stop. Otherwise classify the in-scope intent:
  - **Targeted edit** — args describe partial changes to specific unfinished tasks (split, merge, retitle, swap SOM steps). Apply the described edits in place.
  - **Insertion** — args describe adding one or more new tasks. If the user names a position **inside the unshipped tail** ("before TASK 6", "after TASK 4"), insert the new task at that integer and bump every later **unshipped** task by 1 (in both `OPERATION.md` and `TASKS.md`); reorder OPERATION.md so task sections appear in integer order on disk. **Shipped tasks** (those with a `#### After-Action Report` heading) keep their integers — never renumber them, and reject any insertion position that would require it (tell the user the slot is inside the shipped prefix). With no named position, append at the next free integer after the last existing task.
  - **Multi-task revision** — args describe removing or rewriting multiple unfinished tasks at once. Apply the described edits; renumber subsequent unfinished tasks as needed. Never delete or rewrite a task whose `#### After-Action Report` heading is present.
  - **Full restart** — args explicitly say start over (e.g., "rewrite OPERATION ORDER from scratch"). Confirm with `AskUserQuestion` that the user really wants this. If they do, rewrite OPERATION ORDER and renew all tasks even finished.

### 7. Write OPERATION.md OPERATION ORDER

One `### TASK N — Title` subsection per task, in order. Each task section has two subsections — **`#### Intent`** and **`#### Scheme of Maneuver`** — in that order.

- `#### Intent` — one sentence, ≤ ~25 words, naming the **approach** this task takes at the level a PR title would name it. Prose, not a spec. No code fences, no column lists, no signatures, no DDL, no verification clauses (`pnpm test-types` is green, etc. — implicit from SOM). Backtick a symbol/path/filename only when it _is_ the subject of the headline (the thing being added, slimmed, renamed); skip backticks for incidental mentions. Intent is the skim-anchor — concrete shapes and concrete steps both live in SOM. Examples:

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

- `#### Scheme of Maneuver` — the per-task body. **Mandatory.** Always contains an **action list** (Add / Edit / Move / Delete / Run / Manual) that `/splash` walks when shipping the task. Optionally preceded by an **ASCII artifact** — control-flow diagram, UI wireframe, schema layout, signature diff, or outline — when the task introduces or modifies control flow, request lifecycle, UI layout, symbol/path signatures, DB schema (table column lists), DTOs, API request/response shapes, or document structure. When you include an artifact, place it above the action list. Pick the artifact shape that best fits the change:
  - **Control flow**: a box-and-arrow diagram (or a sequence-style listing) showing the order of operations and decision branches. Untagged fence.
  - **UI**: a wireframe-style ASCII sketch showing the screen regions, key elements, and interactions. Untagged fence.
  - **Schema layout**: a fenced block listing each column with its type, constraints, and FK relationships (one column per line). Tag with `sql` if you're writing literal DDL; otherwise leave the fence untagged.
  - **Signature changes / before-after layouts, DTOs, API shapes, public function signatures**: pick the fence tag in this priority order so code editors and markdown renderers syntax-highlight it correctly:
    1. **The language the symbols actually live in** (preferred — e.g., `ts` for a `NaholoClient.recordAgentSession` signature, `py` for a Python service method, `rs` for a Rust function).
    2. **The project's primary language** (backup — use when the task spans the project broadly and no single file owns the symbol).
    3. **Pseudo-code, last resort** (when neither of the above applies — e.g., a cross-language design sketch). Write it in TypeScript-ish syntax inside an **untagged** fence so renderers don't misclassify it.

    Use real exported symbol names when the type/class will exist in code (`AgentSessionPayload`, `NaholoClient`, etc.). When the shape is anonymous in code (e.g., an inline request body object literal in a route handler with no exported type), use a placeholder name prefixed `sample_` in snake*case (`sample_request_body`, `sample_response_body`, `sample_hook_payload`) so the reader knows the name itself is illustrative, not a symbol to grep for. The `sample*\*` convention applies regardless of the chosen language.

  - **Linear / trivially simple flow**: a numbered list is acceptable instead of a diagram.
  - **Outline-shaped tasks (new doc, doc restructure)**: list the doc's section headings; under **only the sections this task modifies**, add a short bullet list naming the core ideas — single short phrase or sentence each, not paragraphs or copy draft. Untouched sections stay heading-only.

  Example (control flow):

  ```
  // auth control flow
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

  Example (outline-shaped task, untagged fence):

  ```
  # Title
  ## Section A
    - core idea 1
    - core idea 2
  ## Section B (new — replaces old "Foo" section)
    - what this section establishes
    - why it replaces "Foo"
  ## Section C
  ```

  The **action list** — always present, below any optional artifact — names the atomic steps that ship this task. Each item is one of six verbs:
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
    - `readOpYml`, `writeOpYml`: new — read/write `op.yml` at the infilled root
  - Add packages/naholo-cli/src/commands/agent/infil.ts
    - `infil` subcommand: writes op.yml and pulls data
  - Move packages/naholo-cli/src/lib/local-operations.ts → packages/naholo-cli/src/lib/infilled.ts — rename now that "operations" plural is gone
  - Delete packages/naholo-cli/src/commands/agent/op-list.ts — superseded by `op`
  - Run `mv .naholo/local/operations/122 .naholo/local/infilled` — migrate this op's data
  - Manual: run `pnpm db:migrate` after the schema edit lands (CLAUDE.md forbids the agent from running it)
  ```

  Include all steps you can predict; `/splash` may add files in its AAR if it discovers more.

  Do **not** list general post-edit verification commands (formatters, type checkers, etc.) that already live in `CLAUDE.md` or `.claude/rules/` — `/splash` reads those rules and runs the verifications itself. The action list should only carry steps that are specific to this task. Project-owned actions the agent must not run (e.g. database migrations) still belong on the action list as `Manual: {action}` so `/splash` surfaces them.

`/opord`'s per-task template ends at `#### Scheme of Maneuver`. Do **not** write a `#### After-Action Report` heading or body — `/splash` adds the heading + body when it ships the task.

Single-commit sizing rules:

A single-commit-sized task is one cohesive change that a reviewer can read as a single diff — one motivation, one verb in the title, no unrelated edits riding along. If you'd struggle to write its commit message without an "and", split it.

- Each task should be a chunk a reviewer can read and understand in a few minutes after `/splash` ships it.
- **Intent is the approach summary only.** Concrete shapes and concrete steps both live in SOM — Intent must stay a single skim-readable headline.
- **Compound titles are a split tell.** If a task title needs a comma, "and", or "+" to describe it ("Slim X, relocate Y, strip Z"), each clause is a split candidate. Split until every title is a single verb + object.
- No sub-tasks. If a chunk feels like it needs sub-bullets, split it into two top-level tasks. (SOM action-list sub-bullets are not sub-tasks — they're per-symbol annotations on a single step.)
- Tasks are ordered for shipping — top-to-bottom is the default `/splash` order.
- An intent that says "do A or B" is a bug — pick one and explain the reasoning in the WARNO's Constraints (or ask `/warno` to add the decision if it's missing).

### 8. Mirror to TASKS.md

Sync `TASKS.md` to match the OPERATION ORDER task list:

- Heading stays `# TASKS — OP #{n}`.
- One `- [ ] N. Title` line per `### TASK N — Title`, in order. Flat — no indentation, no sub-bullets.
- Preserve existing `[ref](naholo://tasks/{id})` links and `[x]` done states for tasks that are still present.
- Add new tasks as `- [ ]`. Remove deleted tasks (only if they have no `#### After-Action Report` heading — never remove a shipped task).
- Renumber as needed; keep titles synced with the task headings.

### 9. Append a TIMELINE bullet

Summarize what step 6 changed in one line, then run `naholo agent add-timeline -T opord '{summary}'`.

### 10. Print summary

Show the plan state. Use markdown link syntax. Print as raw markdown — no surrounding fence.

The summary's primary link points at the **most-affected scope** of this run, so the user can jump straight to what changed:

- **Fresh write / full restart** → link to `## OPERATION ORDER` (the whole section is new). Label: `OPERATION ORDER`.
- **Targeted edit on a single task** → link to that task's `### TASK N — Title` heading. Label: `TASK N`.
- **Insertion of one new task** → link to the inserted task's heading. Label: `TASK N`.
- **Multi-task revision / multiple insertions** → list one link per affected task on its own bullet. Labels: `TASK N`.

Resolve `<line>` by reading back `OPERATION.md` after writing OPERATION ORDER and locating the matching heading. The link label stays semantic per the manual's `## Chat output` → `### Link format` rule — no `#L<line>` in the label.

Example (fresh write, printed directly, not fenced):

Plan complete for OP #42: "Implement user auth"

- Tasks: 6 total (0 done, 6 remaining)
- OPORD: [OPERATION ORDER]({operationDir}/notes/OPERATION.md#L<line>)
- Tasks: [TASKS.md]({operationDir}/TASKS.md)

Example (targeted edit on TASK 4):

Plan adjusted for OP #42: "Implement user auth"

- Tasks: 6 total (3 done, 3 remaining)
- Edited: [TASK 4]({operationDir}/notes/OPERATION.md#L<line>)
- Tasks: [TASKS.md]({operationDir}/TASKS.md)

Next:

- Looks good → run `/splash` to ship [TASK 1]({operationDir}/notes/OPERATION.md#L<line>)
- Plan adjustment (insert, drop, split, retitle, rewrite unfinished tasks) → re-run `/opord "freeform instructions"` or edit OPERATION ORDER directly
- Direction change → re-run `/warno "freeform instructions"` to revise the WARNO
- Optionally → `/sitrep` to push current plan to the server

## Post-opord phase

Once this skill returns, the session is in the **opord** phase. The phase persists until a different phase-changing skill runs (`/infil`, `/warno`, `/splash`), `/exfil` cleans up the workflow, or the session ends. `/sitrep` is a sync-only operation and does **not** end the phase.

While in the opord phase:

- **In-phase follow-up edits** — any plan-revision the user asks for on **unfinished** tasks (insert / drop / split / merge / retitle / rewrite SOM steps, refresh `TASKS.md` to match) is part of this phase. Apply the edit and fire a single `naholo agent add-timeline -T opord '<summary>'` per discrete event so a future fresh session sees what changed. Completed tasks (those with a `#### After-Action Report` heading) remain immutable.
- **Wrong-phase requests** — route exactly as `## Wrong-intent pushback` at the top of this skill: if the request belongs to a different skill, name the owning skill and stop — do **not** silently do the work. Direct-call args and post-phase follow-ups push back identically.

## Rules

- **OPORD-only**: `/opord` writes (or revises) `## OPERATION ORDER` and mirrors to `TASKS.md`. It does NOT touch `## WARNING ORDER` — direction changes belong to `/warno`.
- **WARNING ORDER must exist**: abort with a "run `/warno` first" message if WARNING ORDER is absent or missing required subsections.
- **No sub-tasks**: every task is flat. If you feel the urge to sub-bullet, split into two tasks.
- **Completed tasks are immutable**: a task with a `#### After-Action Report` heading MUST NOT be edited, renumbered, or removed.
- **Decisions commit to one path**: every task Intent headline names the chosen approach. "Pick A or B" phrasing is a bug — redraft, or ask `/warno` to add the missing Constraint.
- **Preserve `[ref]` links** in TASKS.md.
- **Respect existing done states**: don't uncheck `[x]` items in TASKS.md.
- **OPERATION.md has exactly three top-level sections**: SITUATION, WARNING ORDER, OPERATION ORDER. Nothing else. Per-task progress lives in OPERATION ORDER's AARs; chronological events live in TIMELINE.md.
- **Rejected sub-bullets**: comma-join alternatives, no reasons unless the user added them.
- **Shipped tasks are immutable integers**: a task with a `#### After-Action Report` heading keeps its integer forever — never renumber it, never re-slot it. Unshipped tasks may be re-slotted (e.g., inserting "before TASK 6" bumps later unshipped tasks by 1). Numbering is plain `TASK 1`, `TASK 2`, …; no letter-suffix. (Historical letter-suffix tasks — e.g. `TASK 3a` — stay as-is; they're immutable AAR records from before this doctrine.)
- **Do NOT implement any code** — only edit `OPERATION.md` and `TASKS.md`; TIMELINE.md is updated via `naholo agent add-timeline`.
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with `opPath` from boot's `<op_status>`.
