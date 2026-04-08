# P26: Skill Management & CLI Integration

## Goal

Add a skill storage system to Naholo so that projects can define Claude Code skills (`.claude/skills/` SKILL.md files) and MCP configuration. Provide a CLI (`naholo`) that authenticates users, bootstraps local project config, and manages skills — enabling an integrated workflow where users write rough ideas in Naholo issues, elaborate plans locally, push them back, and execute them.

## Key Design Changes

- **Skill sets**: Skills are grouped into skill sets (Project → SkillSet → Skill → SkillRevision). Skill set slugs are `[a-z0-9-]+`, unique per project.
- **Install model (replaces sync/push/pull)**: `naholo skills install` lets user pick a skill set, then writes each skill as a plain `.claude/skills/{name}/SKILL.md` file. No conflict resolution, no revision tracking during sync.
- **Upsert model (replaces push)**: `naholo skills upsert <skillSetSlug> <skillName> <filePath>` creates or updates a server skill and creates a new revision.
- **Skill revisions**: Each skill update creates a revision for content history tracking.
- **User API tokens**: CLI authenticates as a user (not a project worker). User tokens work across all projects. OAuth-like login flow via browser.
- **Config split**: Global auth at `~/.naholo/` (profiles), project config at `.naholo/config.yml` (committed), local config at `.naholo/local/` (git-ignored).
- **List API excludes content**: Skill list only returns metadata; individual GET returns full content.

## Sub-Plans

### [p26-s1: Skill Storage](p26-s1-skill-storage.md) — DONE

DB schema (`skills` table), service layer, REST API (CRUD).

### [p26-s2: Skill Management UI](p26-s2-skill-ui.md)

React Query hooks + Skills settings page for viewing/creating/editing/deleting skills in the web app.

### [p26-s3: Skill Revisions](p26-s3-skill-revisions.md)

Revision tracking system for conflict detection. `skill_revisions` table, updated API responses with `revisionId`, list endpoint without content.

### [p26-s4: User Auth & CLI Login](p26-s4-user-auth-cli-login.md)

User API tokens (separate from worker tokens), OAuth-like CLI login flow, global `~/.naholo/` profiles.

### [p26-s5: CLI Commands](p26-s5-cli-commands.md) — DONE

CLI package with `naholo init`, `naholo status`, skill sync/pull/push commands. Project + local config management. (Sync/pull/push replaced by install/upsert in s6.)

### [p26-s6: Reimplement Skills — Skill Sets + Install Model](p26-s6-reimplement-skills.md) — DONE

Replaced sync/push/pull with install/upsert model. Added skill sets grouping layer. New CLI commands: `naholo skills install`, `naholo skills upsert`, `naholo skills sets`. New web UI pages: skill-sets list, skill-set detail, skill detail/editor. Removed all pulled-skill machinery.

### [p26-s7: MCP & Dogfooding](p26-s6-mcp-and-dogfooding.md)

Update naholo-mcp config resolution for new config structure, add skill MCP tools, write dogfooding skills for this repo.

## Architecture Overview

### Config Hierarchy

```
~/.naholo/                          # Global (user, all machines)
├── config.yml                      # defaultProfile pointer
└── profiles/{name}.yml             # baseUrl + user token

.naholo/                            # Project-level (in git repo)
├── config.yml                      # projectId, defaultWorkerId (committed)
├── .gitignore                      # ignores local/
└── local/                          # Git-ignored
    └── local-config.yml            # workerId for this user
```

### Skill Workflow

1. **Web UI** — Browse skill sets, create/edit/delete skills at `/app/projects/{projectId}/skill-sets/`
2. **`naholo skills install`** — Pick a skill set interactively, writes each skill as `.claude/skills/{name}/SKILL.md` (full content, no stubs)
3. **`naholo skills upsert <skillSetSlug> <skillName> <filePath>`** — Upload local skill file to server, creates revision
4. **`naholo skills sets create/update/delete`** — Manage skill sets from CLI

### Auth Model

- **User API tokens** (`naholo_user_` prefix): Per-user, work across all projects. Used by CLI and MCP.
- **Worker API tokens** (`naholo_` prefix): Per-project, per-worker. Used for external integrations (bots, CI).
- CLI authenticates with user tokens; MCP reads worker identity from `.naholo/local/local-config.yml`.

## Prerequisites

- naholo-mcp package exists at `packages/naholo-mcp/`
- Project worker API tokens exist
- Workers page exists at `/app/projects/[projectId]/workers/`

## Data Model

```
Project
  └─ SkillSet (name, slug — unique per project)
       └─ Skill (name — unique per skill set, sorted by name)
            └─ SkillRevision (content snapshot)
```

## Notes

- Sub-plans s1–s6 are complete. Next: s7 (MCP & dogfooding).
- s6 replaced the sync/push/pull model from s5 with a simpler install/upsert model and added skill sets.
- Skills no longer have a `position` column — sorted by name.
- Skills belong to a project transitively through skill sets (`skill.skillSetId → skillSet.projectId`).
