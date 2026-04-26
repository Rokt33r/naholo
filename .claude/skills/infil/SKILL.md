---
name: infil
description: Infil a Naholo operation — fetch objectives, notes, and logs locally for offline-first workflow.
argument-hint: '{operationNumber}'
model: sonnet
---

# Infil — Infil Operation

Fetch an operation's full context from Naholo and set up a local working directory for the `/spec` → `/ship` → `/sitrep` (mid-session) → `/exfil` (done) workflow. Use `/sitrep` between `/ship` sessions to sync progress without closing.

Infil is a one-way bring-down from server to local. It never pushes. If OPERATION.md needs to be created, it is written locally only — the user runs `/sitrep` or `/exfil` later to sync upstream.

## Arguments

The argument is the operation number (e.g., `42`). Required.

## What to do

0. **Load personality**: If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

0.5. **Load manual**: If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

1. **Pull via CLI**: Run `naholo agent pull {operationNumber}`. Capture the absolute operation directory from the `Local:` line — call this `{operationDir}`.

2. **Read context**:
   - **Title**: from the `Title:` line of pull's stdout.
   - **Logs**: `{operationDir}/LOGS.yml` (YAML array of `{ id, createdAt, author, content }`).
   - **Notes**: every `*.md` file in `{operationDir}/notes/`.

3. **Handle OPERATION.md** (using the context from step 2):

   OPERATION.md is always the evolving context document — it is never the spec.

   **If `{operationDir}/notes/OPERATION.md` does not exist**:
   - Write it to `{operationDir}/notes/OPERATION.md` **locally only** via the `Write` tool. Do NOT push during infil — the user runs `/sitrep` or `/exfil` later.
   - Template:

     ```markdown
     # OP #{operationNumber}: {title}

     ## Pain

     What's wrong or missing. ≤3 sentences from title + logs + notes.
     If not stated, mark with "_Agent-generated assumption:_".

     ## Resolution

     How we plan to fix it. ≤3 sentences from title + logs + notes.
     If not stated, mark with "_Agent-generated assumption:_".

     ## Open questions

     ### {Question text}

     Answer ->

     ### {Another question}

     Answer ->

     ## Timeline

     - **{YYYY-MM-DD HH:MM} — {author}**: {summary of log entry}
     - **{YYYY-MM-DD HH:MM} — {author}**: {summary of log entry}
     ```

   - **Pain / Resolution**: keep brief — details go in SPEC during `/spec`.
   - **Open questions**: top 3 (or fewer) questions that deepen understanding of the **pain** and **resolution** — user motivations, hidden constraints, success criteria, scope boundaries, edge cases, prior attempts, stakeholders affected. Do NOT ask about file paths, function names, schema fields, or other implementation details — `/spec` will research those from the codebase. Only ask the user what the user uniquely knows. Each question gets its own `###` heading with `Answer -> ` on the next line.
   - **Timeline**: one bullet per log entry, using each entry's `createdAt` and `author`.
   - If other notes exist, add pointers (e.g., "See `api-design.md` for endpoint specs") in Pain or Resolution where relevant.
   - Do NOT elaborate or create an implementation plan — just capture current state.

   **If OPERATION.md already exists**:
   - Find what changed since the last `## Timeline` entry: new logs (LOGS.yml entries with `createdAt` later than the last Timeline date) and note changes (created/updated, from pull's CLI report).
   - If nothing new → note "OPERATION.md is up to date" in the summary.
   - If something new → summarize it (e.g., "3 new logs, `research.md` updated") and **ask the user** whether to append a Timeline bullet. On confirmation, append one bullet to `## Timeline` summarizing the new logs and note changes.

4. **Print summary**: Output a summary using markdown link syntax for clickable paths. Print as raw markdown — no surrounding fence. List workflow notes first in the fixed order OPERATION → OBJECTIVES → SPEC, then other notes alphabetically.

   If the CLI reported note conflicts, append a `**Conflicts to resolve manually:**` section listing each conflicted note as a clickable bullet so the user can open it in their editor — the user resolves them outside this skill.

   Example (printed directly, not fenced):

   Infiled operation #42: "Implement user auth"
   - Objectives: 12 (5 done, 7 remaining)
   - Notes: OPERATION [created], api-design, research
   - Logs: 8 entries
   - Local: [{operationDir}/]({operationDir}/)
   - Operation: [OPERATION.md]({operationDir}/notes/OPERATION.md)
   - Spec: [SPEC.md]({operationDir}/notes/SPEC.md) (if exists)

   **Conflicts to resolve manually:**
   - [api-design.md]({operationDir}/notes/api-design.md)
   - [research.md]({operationDir}/notes/research.md)

   Substitute `{operationDir}` with the absolute path printed on the pull's `Local:` line. Include the CLI output details (objectives updated/inserted, notes merged) in the summary.

## Rules

- **Use `naholo agent pull` for all file I/O from server** — do not manually create directories, manage `.base/` files, or sync objectives/notes. The CLI handles all of that.
- **Infil never pushes**. If OPERATION.md is missing, write it locally via the `Write` tool only — no `create_note` MCP call, no re-pull. User syncs upstream later via `/sitrep` or `/exfil`.
- On re-run, the CLI handles 3-way merge automatically. If conflicts are reported, tell the user and wait for resolution.
- Do NOT implement any code — only fetch and write local files.
- Do NOT elaborate or expand the plan — just capture current state.
- Objective notes from the server should be folded into OPERATION.md context, NOT written to OBJECTIVES.md (OBJECTIVES.md is a pure checklist).
- Print the summary as raw markdown — no surrounding fence.
