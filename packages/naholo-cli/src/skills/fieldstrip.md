---
name: fieldstrip
description: Compact a skill markdown — strip no-ops, dedup step-vs-rules, show formats as examples. Pass a skill name or a path to the markdown file.
argument-hint: '<skill-name | path-to-markdown>'
---

# Fieldstrip — Compact a Skill

Disassemble a skill's markdown, clean out the gunk, reassemble it lean. Three cuts, in order: strip no-ops, dedup step-vs-rules, replace format prose with examples. Compaction only — never change what the skill tells the agent to do.

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

### 5. Edit in place

Apply the cuts to the file. Keep the frontmatter, the section order, and every behavioral instruction intact.

## Rules

- **Compaction only** — never change what the skill does; if a cut would alter behavior, keep the line.
- **Remove and reshape, never add** — no new sections, no new guidance.
- When unsure whether a line is a no-op, keep it.
