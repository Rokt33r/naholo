---
name: fieldstrip
description: Compact a skill markdown — strip no-ops, dedup step-vs-rules, show formats as examples, tighten prose; flag riskier cuts for review. Pass a skill name or a path to the markdown file.
argument-hint: '<skill-name | path-to-markdown>'
---

# Fieldstrip — Compact a Skill

Disassemble a skill's markdown, clean out the gunk, reassemble it lean. Apply four safe cuts in order — strip no-ops, dedup step-vs-rules, replace format prose with examples, tighten prose — then surface the riskier compactions as suggestions for the user to decide. Compaction only — never change what the skill tells the agent to do.

## Arguments

Required: the target skill, in either form.

- **Skill name** (e.g. `opord`) — resolved to its markdown: project `.claude/skills/{name}/SKILL.md` first, then global `~/.claude/skills/{name}/SKILL.md`.
- **Path** (contains a `/` or ends in `.md`, e.g. `~/.claude/skills/foo/SKILL.md`, `./src/skills/bar.md`) — used as-is.

## What to do

### 1. Resolve + read the target

Treat the arg as a path when it contains a `/` or ends in `.md`; otherwise as a skill name — resolve it against the project skills dir, then the global one. Read the file. If the target is missing or resolves to no file, stop and ask for one.

### 2. Strip no-ops

A no-op is a line that doesn't change agent behavior: delete it and every agent acts the same. Cut them. Test each candidate — _if I remove this, does any agent do something different?_ No → it's a no-op.

No-ops to cut:

- "Be thorough." / "Make it easy to read." / "Write a detailed commit message." — agents already do this.
- "Respect `CLAUDE.md`." / "Follow the project conventions." / "Remember `AGENTS.md`." — telling the agent to obey an authority that's already loaded in its context changes nothing; the file is in effect whether or not the skill name-drops it.
- A sentence that restates its own heading.
- A rationale that doesn't gate a decision.

Not a no-op — keep these: a line that adds a constraint the agent wouldn't apply on its own (e.g. `Do NOT implement any code` in a planning skill), or a pointer telling the agent where to look and what to run (e.g. "run the verifications defined in `CLAUDE.md`"). The test is the dividing line: restating an authority is a no-op; adding a constraint or an action is not.

### 3. Dedup step-vs-rules

A rule stated in two places drifts. Place each by reach:

- Used in **1 step** → keep it inline in that step.
- Used in **2+ steps** → state it once under `## Rules`, delete the inline copies.

### 4. Show formats as examples, not prose

A format explained in prose is harder to read than the format itself. Replace the description with a fenced example.

Before:

```
### Constraints
A flat bullet list of decisions. Each bullet opens with a bold one-line label
stating the decision, then `: ` and a single sentence of reasoning.
```

After:

```
### Constraints

- **<decision>**: <one-sentence reasoning>
```

### 5. Tighten prose (safe — apply)

Compress the lines that survive cuts 2–4 without changing what they trigger. Keep the action verb; cut the decoration around it.

- Drop rationale that doesn't gate a decision — keep the instruction, cut the "so…/because…" tail ("re-read every run so edits land" → "re-read every run").
- Lead with the verb, one instruction per sentence; cut hedges ("note that", "generally", "as needed", "it's worth").
- Cut meta-scaffolding that restates an always-loaded authority ("print raw, per the manual" — the manual already mandates it). Same test as step 2's no-ops.

The tightened line must trigger the same agent actions, no more, no fewer. If a clause might change what the agent does, it's not safe — leave it, or raise it in step 7.

### 6. Edit in place

Apply cuts 2–5 to the file. Keep the frontmatter, the section order, and every behavioral instruction intact.

### 7. Suggest the riskier cuts (do not apply)

Some compactions trade tokens for risk and need a human call — never apply them. After editing, list the **top 5 by impact** (most tokens saved or most clarity gained) for the user to decide; fewer if there aren't five worth raising. One line each: where + what change + the trade.

Candidates:

- Telegraphing explanatory prose into bare instructions — may drop nuance the agent leans on for judgment calls.
- Collapsing a multi-example set to one — fine for variants of one pattern, lossy when each example teaches a distinct case.
- Cutting emphasis or repetition on a destructive / order-sensitive step — the redundancy may be load-bearing.

Format:

```
Suggestions (review — not applied):
1. {section} — {what to change} → {trade}
2. …
```

The user picks which to apply; they re-run or hand-edit to land them.

## Rules

- **Compaction only** — never change what the skill does; if a cut would alter behavior, keep the line.
- **Remove and reshape, never add** — no new sections, no new guidance.
- **Safe cuts apply, risky cuts only suggest** — cuts 2–5 land in the file; step 7's judgment/risky candidates are surfaced for the user, never applied. Cap suggestions at the top 5 by impact.
- When unsure whether a line is a no-op, keep it.
