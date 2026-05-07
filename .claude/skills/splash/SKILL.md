---
name: splash
description: Ship one OBJ from an infiled Naholo operation — implement code, write the AAR, check the OBJECTIVES box.
argument-hint: '[N] ["freeform"]'
---

# Splash — Ship One OBJ

Implement exactly one OBJ from `OPERATION.md` `## EXECUTION`, write the After-Action Report into the same OBJ section, flip the OBJECTIVES.md checkbox, and stop. The user reviews the AAR, then re-runs `/splash` for the next OBJ.

## Arguments

No operation number — the skill resolves the active operation via `naholo agent op-list`.

First positional token (optional):

- **Integer `N`** — ship OBJ N specifically. Required when multiple unchecked OBJs exist and you want to skip ahead, or when re-running on an already-shipped OBJ to revise its AAR.
- **No integer** — ship the next unchecked OBJ from `OBJECTIVES.md`.

Anything in quotes after is freeform context for the splash. Common patterns:

- `/splash 3 "ref docs/style.md"` — extra reference docs to read
- `/splash 2 "use the existing helper in src/utils/foo.ts"` — implementation hint
- `/splash 5 "tweak: the AAR should mention the migration"` — revision instruction when re-running on a shipped OBJ

## What to do

### 0. Load personality

If you haven't already read `naholo://soul` in this session, read it now. If non-empty, adopt it as your personality and voice. If empty or already loaded, skip.

### 0.5. Load manual

If you haven't already run `naholo agent man` in this session, run it now via the Bash tool and adopt the rules (terminology, note formats, chat-output rules). Otherwise skip.

### 1. Find infiled operation

Run `naholo agent op-list`.

- If none exist → tell user to run `/infil {operationNumber}` first and stop.
- If multiple exist → show the list and ask user which one.

### 2. Resolve operation directory

Run `naholo agent op-path {operationNumber}` to get the absolute operation directory; call this `{operationDir}`. If `{operationDir}` does not exist on disk, tell the user to run `/infil {operationNumber}` first and stop.

### 3. Read state

Read:

- `{operationDir}/OBJECTIVES.md`
- `{operationDir}/notes/OPERATION.md`
- `{operationDir}/notes/TIMELINE.md`

Validate: `## EXECUTION` must contain at least one `### OBJ N — Title` section. If EXECUTION is empty or shows the `_(empty …)_` placeholder, tell the user to run `/plan` first (and `/recon` first if MISSION is also empty) and stop.

### 4. Pick the target OBJ

- If `N` was provided → target OBJ N. If no matching `### OBJ N` section exists, stop and tell the user.
- Otherwise → target the first unchecked OBJ in OBJECTIVES.md, top to bottom. If all are `[x]`, tell the user there's nothing left and suggest `/exfil`.

If the targeted OBJ already has a non-empty `#### After-Action Report`, this is a **revision splash** — see step 7 (AAR update path).

### 5. Read the OBJ contract

From OPERATION.md `### OBJ N — Title`:

- The goal paragraph (success criterion).
- `#### Scheme of Maneuver` (when present) — ASCII diagram of the planned flow / UI; treat as authoritative shape for the splash.
- `#### Target files` — the planned file list.
- Anything in `#### After-Action Report` if present (revision splash only).

If freeform args are provided, treat them as additional context to weigh during implementation. Do not let them silently expand scope beyond what the OBJ goal specifies — if they ask for more than, or different from, what the OBJ goal covers, **stop before implementing** and surface two options to the user:

1. **Run `/plan` first** — modify the undone OBJ to absorb the new scope, or create a new OBJ for it (FRAGO). Pick this when the change is large enough to deserve its own review checkpoint, or when it should be a separate splash.
2. **Splash anyway, capture in AAR** — proceed with the expanded scope this run, and document the deviation explicitly in the `#### After-Action Report` (what was added beyond the original goal, why, and any follow-up implications). Pick this when the change is small and naturally lives with the current OBJ.

Wait for the user to choose before continuing.

### 6. Implement (fresh splash path)

Implement the code changes that satisfy the OBJ goal:

- Modify or create the files listed in Target files.
- Add files not in the list if they're genuinely required — note them in the AAR as deviations.
- Follow `CLAUDE.md` conventions and any project style rules.
- Stay within the OBJ scope. Do not refactor surrounding code, add features, or fix unrelated issues.

After the changes are written:

- Run the formatter: `npm run format` (or the project's equivalent).
- Run the type checker: `npx tsc` (or the project's equivalent).
- Fix anything that breaks before proceeding.

### 7. Write the AAR (or update it for revision splashes)

Replace the body of `#### After-Action Report` inside the OBJ's section with a concise report:

- **What shipped**: 1–3 sentences on the actual change.
- **Deviations**: anything that differs from the planned Target files or goal — extra files, alternate approach, scope adjustments. Empty bullet list if none.
- **Notes for review**: anything the reviewer should know — known follow-ups, risks, things deferred to a later OBJ.

For a **revision splash** (the OBJ's AAR was already non-empty when picked), overwrite the AAR in place — do not append a second AAR section, and do not add a new `#### After-Action Report (revised)` heading. The AAR is the canonical record of what's currently true on disk for that OBJ; revision history lives in TIMELINE.md.

### 8. Flip the checkbox

In `OBJECTIVES.md`, flip `- [ ] N. Title` → `- [x] N. Title` for the OBJ that just shipped. For revision splashes, the box is already `[x]` — leave it.

### 9. Append a TIMELINE bullet

Append one bullet to `{operationDir}/notes/TIMELINE.md`:

- Fresh splash: `- **{YYYY-MM-DD HH:MM} — splash**: OBJ {N} shipped — {one-line summary}.`
- Revision splash: `- **{YYYY-MM-DD HH:MM} — splash (revised)**: OBJ {N} AAR updated — {one-line summary of the change}.`

Use local time in `YYYY-MM-DD HH:MM` format (matches the format `/infil` seeded TIMELINE.md with).

### 10. Print summary

Print as raw markdown — no surrounding fence. Show what was shipped, the key files, and the next OBJ.

Example:

OBJ 3 shipped: "Add /splash skill spec"

- Goal hit: yes
- Key files:
  - [docs/skills/SPLASH.md](docs/skills/SPLASH.md)
- Deviations: none
- AAR: [OPERATION.md → OBJ 3]({operationDir}/notes/OPERATION.md)
- Progress: 3/8 OBJs done
- Next: `/splash` to ship OBJ 4 ("/sitrep skill rewrite")

If the user should review before the next splash, mention it. If all OBJs are now done, suggest `/exfil`.

## Rules

- **One OBJ per invocation**: ship exactly one, then stop. The user re-runs `/splash` for the next.
- **AAR is overwritten in place on revision** — never add a second AAR section to an OBJ.
- **Stay in scope**: the OBJ goal is the contract. If you can't ship as described (API changed, file doesn't exist, unexpected architecture), stop and explain. Do not improvise.
- **Don't touch other OBJs**: do not edit other OBJs' Target files, AARs, or goals. If the work reveals that another OBJ needs revision, surface it — don't silently rewrite.
- **OBJECTIVES.md flip is mandatory**: every fresh splash flips one box. Without it, `/splash` (no args) cannot find the next OBJ.
- **TIMELINE.md gets exactly one bullet per splash invocation**.
- **OPERATION.md sections stay at SITUATION / MISSION / EXECUTION**: do not add `## Progress`, `## Notes`, or any other top-level section. Per-OBJ progress lives in EXECUTION's AARs; chronological events live in TIMELINE.md.
- **Don't re-elaborate the OBJ**: if the goal or Target files are missing details, implement your best interpretation and note it in the AAR. Do not rewrite the OBJ goal — that's `/plan`'s job (or `/recon`, if MISSION itself needs to change).
- **Respect CLAUDE.md**: follow project conventions, don't run `db:generate`, etc.
- Print the summary as raw markdown — no surrounding fence.
