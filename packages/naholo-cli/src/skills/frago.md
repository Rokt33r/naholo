---
name: frago
description: Insert a single new task with a letter-suffix number (TASK 3a) next to a target task — write the task section in OPERATION.md, mirror to TASKS.md, optionally revise the immediately downstream unfinished tasks. Never renumbers.
argument-hint: '"freeform instructions for the new task"'
---

# Frago — Insert One Task Next to a Target

FRAGO-style insertion skill. Drops exactly one new `### TASK Na — Title` section into `## EXECUTION` immediately after an anchor task (or the last completed task if no anchor named), mirrors the new task into `TASKS.md`, and — only when the new task's outputs change what a downstream unfinished task must do — revises those downstream tasks in place. **Never renumbers any task**; the new task gets the next free letter suffix in the anchor's sequence. **The suffix is positional, not hierarchical** — `3a` is a sibling of `TASK 3`, not a child of it. Never edits completed tasks. For multi-task revisions or full plan rewrites, use `/opord` instead.

The skill name is the unambiguous "where are we" signal: re-running `/frago` is for slotting in another follow-up task between `/splash` runs. Cutting the plan from scratch is `/opord`'s job; rewriting MISSION is `/warno`'s.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op`.

A freeform string describing the task to insert is **required**. Common patterns:

- `/frago "add a backfill script for the renamed column"` — append after the last completed task.
- `/frago "follow-up to TASK 3: emit a deprecation log for the old route"` — explicit anchor.
- `/frago "after TASK 5: also clear the CDN cache"` — same effect, different phrasing.

If no freeform string is provided, stop and ask the user what to insert.

MISSION-shaped requests (Concept of Operations rewrite, new Warning Order) belong to `/warno`. Multi-task revisions or full restarts belong to `/opord`.

## Numbering doctrine

`/frago` never renumbers. A FRAGO insertion takes a **positional letter suffix** keyed to an anchor task. The suffix is a label, not a hierarchy — `3a` and `TASK 3` are flat siblings in the task list, related only by adjacency:

- First FRAGO anchored at TASK 3 → `### TASK 3a`.
- Second FRAGO anchored at TASK 3 → `### TASK 3b`.
- And so on through the alphabet: `3c`, `3d`, … `3z`. After `3z` the suffix rolls over to two letters: `3aa`, `3ab`, …, `3az`, `3ba`, …, `3zz`, then three letters (`3aaa`, …). Same scheme as spreadsheet columns — bijective base-26 — so the sequence is effectively unbounded.

Rules of the sequence:

1. **No child tasks. Ever.** This workflow uses a flat task list. The `3` in `3a` is a positional cue (insert near TASK 3), not a parent reference. When `/frago` writes to the server via `naholo agent push`, the new task is created at **top level** (no `parentTaskId`). Naholo's data model supports child tasks, but this skill set does not use them.
2. **The anchor is always a top-level integer task** (`TASK 3`, never `TASK 3a`). If the user says "after TASK 3a", treat it as "in TASK 3's sequence" — pick the next free letter in the 3-sequence (e.g., `3c`).
3. **Letter is the next free in the sequence**, not the position. If TASK 3's sequence already has `3a` and `3b`, the next FRAGO anchored at TASK 3 is `3c`, even if the user asks to slot it between `3a` and `3b` in EXECUTION order.
4. **Position in EXECUTION reflects insertion order**, not the letter. Insert the new section immediately after the user's named slot (or after the anchor's last existing sequence entry). Letter order and position may diverge — that's fine; `TASKS.md` is rendered in EXECUTION order, not letter order.
5. **No renumbering, ever.** Downstream unfinished tasks keep their numbers.
6. **Completed tasks are immutable.** A task whose `### TASK N — Title` section contains `#### After-Action Report` cannot be edited, renumbered, or deleted — and `/frago` doesn't need to, since the doctrine never renumbers.

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

### 7. Resolve anchor + insertion slot

Identify the **anchor task** (a top-level integer — the `N` in `N{suffix}`) and the **insertion slot** (the EXECUTION position the new section lands in):

- **User named a top-level anchor** (`/frago "after TASK 3 …"` or `"follow-up to TASK 3 …"`) → anchor is TASK 3. Slot is immediately after TASK 3's last existing sequence entry (TASK 3, then `3a`, `3b`, … if any).
- **User named a FRAGO entry** (`/frago "after TASK 3a …"`) → anchor is still TASK 3 (suffixes always key off a top-level integer). Slot is immediately after TASK 3a in EXECUTION order.
- **No anchor named** → anchor is the last completed top-level task (the highest integer N where `### TASK N` has a `#### After-Action Report` heading). Slot is immediately after that task's last sequence entry.

Then pick the **letter suffix**: walk TASK N's sequence in EXECUTION and find the next unused suffix in spreadsheet-column order — `a`, `b`, …, `z`, `aa`, `ab`, …, `az`, `ba`, …, `zz`, `aaa`, and so on. The new section is `### TASK N{suffix}`.

### 8. Write the new task section

Insert `### TASK N{letter} — Title` into OPERATION.md at the resolved slot. Same per-task template as `/opord` — three subsections in order:

- `#### Intent` — one sentence, ≤ ~25 words, naming the approach.
- `#### Scheme of Maneuver` (optional, but required when the task introduces or modifies control flow / UI / signatures / DB schema / DTOs / API shapes).
- `#### Course of Action` — atomic Add / Edit / Move / Delete / Run / Manual steps with exported-symbol sub-bullets where appropriate.

See `/opord` (or the agent manual) for the full template, fence-tagging rules, and ORP sizing constraints. `/frago` reuses them as-is. Do **not** write a `#### After-Action Report` heading — `/splash` adds that when it ships the task.

### 9. Revise downstream unfinished tasks (only when needed)

If the new task changes what a downstream unfinished task must do — renames a path it edits, replaces a function it calls, shifts a precondition — revise that downstream task in place. Edit the affected `#### Course of Action` bullets, refresh `#### Scheme of Maneuver` if the structure shifted, and update `#### Intent` only when the headline approach itself changed.

**Touch only what the FRAGO actually affects.** Do not rewrite downstream tasks to match a new style, refactor unrelated COA bullets, or restructure tasks that the new work doesn't change. If more than a small handful of downstream tasks need revision, stop and redirect the user to `/opord` — large plan rewrites are out of scope.

**Never edit completed tasks.** A task with a `#### After-Action Report` heading is immutable, even if the FRAGO's outputs would change what that task did. Surface the conflict to the user instead of silently rewriting.

### 10. Mirror to TASKS.md

Sync `TASKS.md` to match the new EXECUTION task list:

- Heading stays `# TASKS — OP #{n}`.
- Insert `- [ ] N{letter}. Title` at the slot matching its EXECUTION position (typically immediately after the last existing family-N entry, before the next top-level integer).
- **Do not touch any other line.** No renumbering, no re-ordering, no checkbox flips. Existing `[ref](naholo://tasks/{id})` links and `[x]` done states stay put.

### 11. Append TIMELINE bullet

Append one bullet to `{operationDir}/notes/TIMELINE.md`:

```
- **{YYYY-MM-DD HH:MM} — frago**: Inserted TASK N{letter} — "{title}" ({summary of why + any downstream revisions}).
```

### 12. Print summary

Show the FRAGO outcome. Use markdown link syntax. Print as raw markdown — no surrounding fence.

Example (printed directly, not fenced):

FRAGO complete for OP #42: "Implement user auth"

- Inserted: [TASK 3a]({operationDir}/notes/OPERATION.md#L<line>) ("Backfill `users.email_verified` for legacy rows")
- Revised: 1 downstream task (TASK 4's COA updated to consume the backfill)
- Tasks: 7 total (3 done, 4 remaining)
- Tasks: [TASKS.md]({operationDir}/TASKS.md)

Resolve `<line>` by reading back `OPERATION.md` after writing the new task and locating its `### TASK N{letter} — Title` heading. The link label stays semantic per the manual's `## Chat output` → `### Link format` rule — no `#L<line>` in the label.

Next:

- Looks good → run `/splash` to ship the next unchecked task
- Need another insertion → re-run `/frago "freeform instructions"`
- Plan-level revision (split / merge / rewrite multiple tasks) → run `/opord "freeform instructions"`

## Rules

- **One insertion per invocation**: insert exactly one new task, then stop.
- **Never renumber**: the letter-suffix doctrine exists to make renumbering unnecessary. If you find yourself rewriting another task's number, you've made a mistake — back out.
- **Flat task list, no children**: the suffix is positional, not hierarchical. `3a` is a top-level sibling of `TASK 3`; when pushed to the server, it must have no `parentTaskId`. Naholo supports child tasks, but this workflow does not use them.
- **Letter is per-sequence, not global**: TASK 3's suffixes (`3a`, `3b`, …) are independent of TASK 5's (`5a`, `5b`, …). Each sequence starts at `a`.
- **Anchor is always a top-level integer**: `/frago "after TASK 3a"` still files in the 3-sequence.
- **Completed tasks are immutable**: never edit, renumber, or delete a task with a `#### After-Action Report` heading.
- **Downstream revisions are surgical, not stylistic**: only revise unfinished tasks whose contract the new task actually changes. Hand the user to `/opord` if the blast radius grows beyond a small handful.
- **Plan-level rewrites belong to `/opord`**: if the request is "rewrite EXECUTION" or "drop TASK 7 and add three new ones", redirect to `/opord` and stop.
- **MISSION changes belong to `/warno`**: do not touch `## MISSION` from this skill.
- **TASKS.md mirror is mandatory**: every `/frago` adds exactly one `- [ ]` line and touches nothing else.
- **TIMELINE.md gets exactly one bullet per `/frago` invocation**.
- **OPERATION.md has exactly three top-level sections**: SITUATION, MISSION, EXECUTION. Nothing else.
- **Do NOT implement any code** — only edit `OPERATION.md`, `TASKS.md`, and `TIMELINE.md`.
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — substitute `{operationDir}` literally with the absolute path from `naholo agent op-path`.
