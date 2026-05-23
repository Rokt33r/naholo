---
name: frago
description: Insert a single new task next to the last completed one — write the task section in OPERATION.md, mirror to TASKS.md, optionally revise the immediately downstream unfinished tasks.
argument-hint: '"freeform instructions for the new task"'
---

# Frago — Insert One Task Next to the Last Shipped

FRAGO-style insertion skill. Drops exactly one new `### TASK N — Title` section into `## EXECUTION` immediately after the last completed task (or at a user-specified position), mirrors the new task into `TASKS.md`, and — only when the new task's outputs change what a downstream unfinished task must do — revises those downstream tasks in place. Never edits completed tasks. For multi-task revisions or full plan rewrites, use `/opord` instead.

The skill name is the unambiguous "where are we" signal: re-running `/frago` is for slotting in another follow-up task between `/splash` runs. Cutting the plan from scratch is `/opord`'s job; rewriting MISSION is `/warno`'s.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`.

A freeform string describing the task to insert is **required**. Common patterns:

- `/frago "add a backfill script for the renamed column"` — append after the last completed task.
- `/frago "between TASK 3 and TASK 4: emit a deprecation log for the old route"` — explicit position.
- `/frago "follow-up to TASK 5: also clear the CDN cache"` — implicit position right after the named task.

If no freeform string is provided, stop and ask the user what to insert.

MISSION-shaped requests (Concept of Operations rewrite, new Warning Order) belong to `/warno`. Multi-task revisions or full restarts belong to `/opord`.

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
- `{operationDir}/notes/TIMELINE.md`

### 6. Validate EXECUTION

`## EXECUTION` must already exist with at least one `### TASK N — Title` section. If EXECUTION is absent, tell the user to run `/opord` first (and `/warno` first if MISSION is also absent) and stop. `/frago` inserts into an existing plan — it does not create one from scratch.

### 7. Resolve insertion position

Pick the insertion slot:

- **User named an explicit position** (e.g., "between TASK 3 and TASK 4") → insert as `TASK 4`; renumber every subsequent unfinished task.
- **User said "follow-up to TASK N"** → insert as `TASK N+1`; renumber every subsequent unfinished task.
- **No position named** → insert immediately after the last task whose `#### After-Action Report` heading is present, i.e. after the last completed task. The new task slots in at the position of the first currently-unfinished task; renumber every subsequent unfinished task.

A completed task is one whose `### TASK N — Title` section contains a `#### After-Action Report` heading. Completed tasks are immutable — never edit, renumber, or delete them. If renumbering would move a completed task's number, stop and tell the user — `/frago` cannot insert in a position that requires moving a shipped task.

### 8. Write the new task section

Append the new `### TASK N — Title` to OPERATION.md at the resolved insertion position. Same per-task template as `/opord` — three subsections in order:

- `#### Goal` — one sentence, ≤ ~25 words, naming the approach.
- `#### Scheme of Maneuver` (optional, but required when the task introduces or modifies control flow / UI / signatures / DB schema / DTOs / API shapes).
- `#### Course of Action` — atomic Add / Edit / Move / Delete / Run / Manual steps with exported-symbol sub-bullets where appropriate.

See `/opord` (or the agent manual) for the full template, fence-tagging rules, and ORP sizing constraints. `/frago` reuses them as-is. Do **not** write a `#### After-Action Report` heading — `/splash` adds that when it ships the task.

### 9. Revise downstream unfinished tasks (only when needed)

If the new task changes what a downstream unfinished task must do — renames a path it edits, replaces a function it calls, shifts a precondition — revise that downstream task in place. Edit the affected `#### Course of Action` bullets, refresh `#### Scheme of Maneuver` if the structure shifted, and update `#### Goal` only when the headline approach itself changed.

**Touch only what the FRAGO actually affects.** Do not rewrite downstream tasks to match a new style, refactor unrelated COA bullets, or restructure tasks that the new work doesn't change. If more than a small handful of downstream tasks need revision, stop and redirect the user to `/opord` — large plan rewrites are out of scope.

**Never edit completed tasks.** A task with a `#### After-Action Report` heading is immutable, even if the FRAGO's outputs would change what that task did. Surface the conflict to the user instead of silently rewriting.

### 10. Mirror to TASKS.md

Sync `TASKS.md` to match the new EXECUTION task list:

- Heading stays `# TASKS — OP #{n}`.
- Insert the new task as `- [ ] N. Title` at the resolved position.
- Renumber subsequent unfinished tasks; preserve their `[ref](naholo://tasks/{id})` links and `[x]` done states.
- Never re-check a `[ ]` task or uncheck a `[x]` task. Never move or renumber a completed task.

### 11. Append TIMELINE bullet

Append one bullet to `{operationDir}/notes/TIMELINE.md`:

```
- **{YYYY-MM-DD HH:MM} — frago**: Inserted TASK N — "{title}" ({summary of why + any downstream revisions}).
```

### 12. Print summary

Show the FRAGO outcome. Use markdown link syntax. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

FRAGO complete for OP #42: "Implement user auth"

- Inserted: [TASK 4]({operationDir}/notes/OPERATION.md#L<line>) ("Backfill `users.email_verified` for legacy rows")
- Revised: 1 downstream task (TASK 5's COA updated to consume the backfill)
- Tasks: 7 total (3 done, 4 remaining)
- Tasks: [TASKS.md]({operationDir}/TASKS.md)

Resolve `<line>` by reading back `OPERATION.md` after writing the new task and locating its `### TASK N — Title` heading. The link label stays semantic per the manual's `## Chat output` → `### Link format` rule — no `#L<line>` in the label.

Next:

- Looks good → run `/splash` to ship the next unchecked task
- Need another insertion → re-run `/frago "freeform instructions"`
- Plan-level revision (split / merge / rewrite multiple tasks) → run `/opord "freeform instructions"`

## Rules

- **One insertion per invocation**: insert exactly one new task, then stop.
- **Completed tasks are immutable**: never edit, renumber, or delete a task with a `#### After-Action Report` heading.
- **Downstream revisions are surgical, not stylistic**: only revise unfinished tasks whose contract the new task actually changes. Hand the user to `/opord` if the blast radius grows beyond a small handful.
- **Plan-level rewrites belong to `/opord`**: if the request is "rewrite EXECUTION" or "drop TASK 7 and add three new ones", redirect to `/opord` and stop.
- **MISSION changes belong to `/warno`**: do not touch `## MISSION` from this skill.
- **TASKS.md mirror is mandatory**: every `/frago` adds one `- [ ]` line and renumbers the downstream unfinished tasks.
- **TIMELINE.md gets exactly one bullet per `/frago` invocation**.
- **OPERATION.md has exactly three top-level sections**: SITUATION, MISSION, EXECUTION. Nothing else.
- **Do NOT implement any code** — only edit `OPERATION.md`, `TASKS.md`, and `TIMELINE.md`.
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` literally with the absolute path from `naholo agent op-path`.
