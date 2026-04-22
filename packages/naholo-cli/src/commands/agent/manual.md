# Naholo Agent Manual

This is the single source of truth for how AI agents work with Naholo operations. Skills (`/infil`, `/spec`, `/ship`, `/sitrep`, `/exfil`) reference this manual instead of re-explaining workflow and file formats.

## Terminology

| Entity    | Acronym | Familiar Term  | Familiar Context                  |
| --------- | ------- | -------------- | --------------------------------- |
| Operation | OP      | issue          | GitHub Issues                     |
| Objective | OBJ     | task           | tasks within an issue             |
| Operator  | OPR     | project member | GitHub / general PM               |
| Campaign  | —       | milestone/epic | GitHub Milestones / PM tool epics |

Users may refer to entities by any column — entity name, acronym, or familiar term. For example, "task 1.1" means objective 1.1; "issue #42" means operation #42. Resolve all aliases.

## Workflow

The agent-facing lifecycle for an operation is a one-way pipeline from server to local, then back:

1. **`/infil {n}`** — Input: operation number on server. Output: `.naholo/local/operations/{n}/` populated with `OBJECTIVES.md`, `notes/*.md`, and `.base/` copies. Generates `notes/OPERATION.md` locally if missing. Never pushes.
2. **`/spec [{n}] ["extra"]`** — Input: infiled operation. Output: `notes/SPEC.md` (executable spec) and an updated `OBJECTIVES.md` mirroring the spec's structure. Prunes unanswered open questions from OPERATION.md.
3. **`/ship [{n}] ["range"]`** — Input: elaborated SPEC.md. Output: code changes, checkboxes flipped in OBJECTIVES.md, Timeline entries appended to OPERATION.md.
4. **`/sitrep [{n}]`** — Input: local dir with progress. Output: server synced (objectives + notes), summary log posted. Does not close.
5. **`/exfil [{n}] ["close"]`** — Input: finished local dir. Output: server synced, summary log posted, optionally closes operation, deletes local dir.

## Notes

Three workflow notes have a fixed contract. All other notes are free-form.

### OPERATION.md

The evolving context document. Written by `/infil` when missing, edited by `/spec`, `/ship`, `/sitrep`, `/exfil` via Timeline bullets.

- **Heading**: `# OP #{n}: {title}`
- **Allowed sections (exactly these four, in this order)**:
  - `## Pain` — what's wrong or missing.
  - `## Resolution` — how we plan to fix it.
  - `## Open questions` — one `### {question}` per question, followed by `Answer ->` on the next line. `/spec` prunes any question whose `Answer ->` line is still empty.
  - `## Timeline` — chronological bullets. Format: `- **{YYYY-MM-DD} — {author-or-stage}**: {summary}`. `/spec`, `/ship`, `/sitrep`, `/exfil` all append their own bullets here.
- **Forbidden sections**: `## Progress`, `## Spec`, or any other top-level section. Progress goes in `## Timeline` as dated bullets.

### OBJECTIVES.md

The canonical checklist. The only file with checkboxes.

- **Heading**: `# OBJECTIVES — OP #{n}`
- Every top-level objective is `- [ ] {n}. {short title}` (e.g., `- [ ] 1. Add man command`).
- Every sub-objective is an indented `  - [ ] {n}.{m}. {short title}` under its parent.
- `[ref](naholo://objectives/{id})` links are appended by `naholo agent push` for newly created objectives — preserve them.
- Checkboxes flip `[ ]` → `[x]` only; never uncheck.
- `/ship` marks progress here incrementally.

### SPEC.md

The executable spec. No checkboxes anywhere.

- **Heading**: `# SPEC — OP #{n}: {title}`
- Recommended sections: `## Goal`, `## Prerequisites`, `## Architecture Decisions`, `## Objectives`, `## Notes`.
- Objectives use hierarchical numbering: `### {n}. {title}` for top-level, indented plain bullets `- {n}.{m}. {title}` for sub-objectives.
- Never `- [ ]` / `- [x]` — progress tracking lives exclusively in OBJECTIVES.md.
- Superseded sub-objectives are struck through with `~~` and get a replacement pointer; never deleted.

### Listing order

When a skill prints a list of notes (infil summary, sitrep recap, etc.), the order is:

1. `OPERATION`
2. `OBJECTIVES`
3. `SPEC`
4. All other notes, sorted alphabetically.

## Commands

### `naholo agent pull <n>`

Fetches the operation from the server and materializes it on disk.

- Fresh run: creates `.naholo/local/operations/{n}/`, writes `OBJECTIVES.md`, `notes/*.md`, and `.base/` copies from server state.
- Re-run: 3-way merges notes line-by-line (via diff3) and structurally merges objectives by ID. Reports `updated`/`kept-local`/`merged`/`conflict`/`created`/`unchanged` per file.
- Outputs a human-readable report with counts. Read stdout to know what happened.
- Agents use this during `/infil`. Never runs pushes.

### `naholo agent push <n>`

Pushes local changes to the server.

- Reads `OBJECTIVES.md` and syncs the objective tree (creates new objectives, updates existing by `[ref]` id).
- Patches newly created objectives with `[ref](naholo://objectives/{id})` links in the local file.
- Reads every `notes/*.md` and creates or updates the corresponding server note.
- Updates `.base/` with the just-pushed state as the new baseline for future 3-way merges.
- Outputs sync counts. Agents use this during `/sitrep` and `/exfil`.

### `naholo agent man`

Prints this manual to stdout. No arguments, no I/O. Skills run it once per session (mirroring the `naholo://soul` pattern) and adopt the rules.

## Chat output

When printing an end-of-skill summary to the user (infil recap, spec summary, sitrep/exfil report), output raw markdown lines directly — **never wrap the summary block in a codeblock fence**. Fenced summaries break `[text](path)` link rendering in the Naholo UI. Files written to disk can still contain fenced code examples; this rule applies only to chat output.
