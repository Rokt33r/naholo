---
name: infil
description: Infil a Naholo operation — fetch tasks, notes, and logs locally for offline-first workflow.
argument-hint: '[{operationNumber}]'
---

# Infil — Infil Operation

Fetch an operation's full context from Naholo and generate `OPERATION.md` if it doesn't exist.

## Arguments

Optional operation number (e.g., `42`).

- **Provided** → fresh infil. Runs `naholo agent infil <n>` to fetch the op from the server and create the infilled directory. Errors if an op is already infilled.
- **Omitted** → re-infil (refresh). Runs `naholo agent reinfil` against the currently infilled op. Errors if nothing is infilled.

## What to do

### 1. Fetch via CLI

Branch on whether `{operationNumber}` was provided.

- **Fresh infil ({operationNumber} provided)**: Run `naholo agent infil {operationNumber}`. If the CLI errors with "Already infilled. Run \"naholo agent exfil\" first.", tell the user that an op is already infilled — they can `/infil` (no args) to refresh it, or `/exfil` first to switch ops. Then stop.
- **Re-infil ({operationNumber} omitted)**: Run `naholo agent reinfil`. If the CLI errors with "No infilled operation", tell the user to pass an operation number (`/infil <n>`) for a fresh infil and stop.

Either way, capture the absolute operation directory from the `Local:` line — call this `{operationDir}`.

### 2. Boot

**If you haven't run `naholo agent boot` this session**, run it now via the Bash tool. Adopt `<personality>` as your voice when the block is present, adopt `<manual>` rules, and cache **only `opPath`** from `<op_status>`. **If boot already ran this session**, run `naholo agent op` instead — treat its `<op_status>` payload as the current op status. `<op_status>` carries `currentOp` / `opTitle` / `opNotes` — read them inline if needed but do not store them.

### 3. Read context

- **Title**: from `opTitle` in `<op_status>` (matches the `Title:` line of infil's stdout).
- **Logs**: `{operationDir}/LOGS.yml` (YAML array of `{ id, createdAt, author, content }`).
- **Notes**: every `*.md` file in `{operationDir}/notes/`.

### 4. Handle OPERATION.md

Using the context from step 3:

OPERATION.md is a container holding the orders issued for one op (see manual for the full schema). `/infil` only seeds `## SITUATION` when generating from scratch; `## WARNING ORDER` is appended later by `/warno`, `## OPERATION ORDER` by `/opord`.

**If `{operationDir}/notes/OPERATION.md` does not exist**:

- Write it locally via the `Write` tool.
- Template:

  ```markdown
  # OP #{operationNumber}: {title}

  ## SITUATION

  ### Pain

  What's wrong or missing. ≤3 sentences from title + logs + notes.
  If not stated, mark with "_Agent-generated assumption:_".

  ### Suggested solution

  (only when logs/notes hint at a solution — otherwise omit this heading entirely)

  A first-pass idea, in the user's words where possible. ≤3 sentences.

  ### Notes

  (only when there's at least one supplementary point worth surfacing — otherwise omit this heading entirely)

  - One-line summary of a non-blocking constraint, related operation, stakeholder mention, or prior-art pointer. Point at `notes/*.md` or `LOGS.yml` for detail.
  ```

- If other notes exist, add pointers (e.g., "See `api-design.md` for endpoint specs") inside SITUATION subsections where relevant.

**If OPERATION.md already exists** (common case: a prior `/sitrep` or `/exfil` already pushed it, and this is a fresh infil after a mid-cycle exfil — e.g., the OP was paused waiting on a prerequisite OP):

- Read the CLI's notes/tasks merge report (created / updated / merged / conflict counts) and summarize it.
- If the merge surfaces a substantive note edit a teammate made server-side that materially changes `### Pain`, `### Suggested solution`, or `### Notes` under SITUATION (e.g., user pivoted the problem, added a hard constraint), patch SITUATION in place. Leave WARNING ORDER and OPERATION ORDER alone — those are owned by `/warno` and `/opord`.
- If the agent needs server-side log context, it reads `{operationDir}/LOGS.yml` directly — TIMELINE is skill-event-only.

### 5. Print summary

Output a summary using markdown link syntax for clickable paths. List workflow notes first in the fixed order OPERATION → TASKS → TIMELINE, then other notes alphabetically.

If the CLI reported note conflicts, append a `**Conflicts to resolve manually:**` section listing each conflicted note as a clickable bullet so the user can open it in their editor — the user resolves them outside this skill.

Output template — substitute `{operationDir}` with the absolute path printed on the infil's `Local:` line, and fold in the CLI output details (tasks updated/inserted, notes merged).

```md
Infilled operation #42: "Implement user auth"

- Tasks: 0 (none yet — to be defined in `/warno`)
- Notes: OPERATION [created], api-design, research
- Logs: 8 entries
- Local: [{operationDir}/]({operationDir}/)
- Operation: [OPERATION.md]({operationDir}/notes/OPERATION.md)

Next:

- Looks good → run `/warno` to research the codebase and cut the WARNING ORDER
- Small op, skip the review → `/raid` to stub the WARNO and cut tasks in one pass
- Idea still rough → `/recon` to research and talk it through before committing to a WARNO
```

## Post-infil phase

Once this skill returns, the session is in the **infil** phase. The phase persists until a different phase-changing skill runs (`/warno`, `/opord`, `/splash`), `/exfil` cleans up the workflow, or the session ends. `/sitrep` is a sync-only operation and does **not** end the phase.

While in the infil phase:

- **In-phase follow-up edits** — any further infil-driven edit the user asks for (refining `## SITUATION`, fixing a typo in the seeded OPERATION.md, adding a SITUATION.Notes bullet pointing at a fresh `LOGS.yml` entry) is part of this phase. Fire a single `naholo agent add-timeline -T infil '<summary>'` per discrete event.
- **Wrong-phase requests** — if the user asks for work that belongs to a different skill, do **not** silently do it. Tell the user to run the proper skill and stop:
  - Drafting / revising `## WARNING ORDER` → `/warno`
  - Cutting tasks / editing `## OPERATION ORDER` or `TASKS.md` → `/opord`
  - Implementing a task → `/splash`
  - Pushing to the server → `/sitrep` (checkpoint) or `/exfil` (final)

## Rules

- **Use `naholo agent infil` for all file I/O from server** — do not manually create directories, manage `.base/` files, or sync tasks/notes. The CLI handles all of that.
- **Infil never pushes**. If OPERATION.md is missing, write it locally via the `Write` tool only — no `create_note` MCP call, no re-pull. User syncs upstream later via `/sitrep` or `/exfil`.
- **`naholo agent infil` owns the entry log post** — a fresh infil posts an entry log to the server as part of the CLI command, exactly as `naholo agent exfil` owns its log post. The agent never posts an infil log directly. Re-infil (`naholo agent reinfil`) is a silent refresh and posts nothing.
- On re-run, the CLI handles 3-way merge automatically. If conflicts are reported, tell the user and wait for resolution.
- Do NOT implement any code — only fetch and write local files.
- Do NOT write `## WARNING ORDER` or `## OPERATION ORDER` headings — `/warno` appends the WARNO, `/opord` appends the OPORD.
- Task notes from the server should be folded into OPERATION.md SITUATION context, NOT written to TASKS.md (TASKS.md is a pure checklist, populated by `/warno`).
- Print the summary as raw markdown — no surrounding fence.
- **Always use absolute filesystem paths in link targets** — e.g., `[OPERATION.md](/Users/.../notes/OPERATION.md)`. Never relative paths (`.naholo/...`) or root-prefixed relative paths (`/.naholo/...`). Substitute `{operationDir}` literally with the absolute path from the infil's `Local:` line (matches `opPath` from `boot`'s `<op_status>`).
