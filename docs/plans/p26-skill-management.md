# P26: Skill Management & CLI Integration

## Goal

Add a skill storage system to Naholo so that projects can define Claude Code skills (`.claude/skills/` SKILL.md files) and MCP configuration. Provide a CLI (`naholo`) that authenticates users, bootstraps local project config, and manages skills — enabling an integrated workflow where users write rough ideas in Naholo issues, elaborate plans locally, push them back, and execute them.

## Key Design Changes (from px-better-cli-design)

- **On-demand skill fetching**: Instead of downloading all skill content, CLI creates lightweight SKILL.md stubs that call `naholo skills get [name]` to fetch content on-demand.
- **Skill revisions**: Each skill update creates a revision. CLI uses `revisionId` for conflict detection on pull/push.
- **User API tokens**: CLI authenticates as a user (not a project worker). User tokens work across all projects. OAuth-like login flow via browser.
- **Config split**: Global auth at `~/.naholo/` (profiles), project config at `.naholo/config.yml` (committed), personal config at `.naholo/personal/` (git-ignored).
- **Skill pull/push**: Users can edit skills locally and push changes back, with 3-way merge for conflicts.
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

### [p26-s5: CLI Commands](p26-s5-cli-commands.md)

CLI package with `naholo init`, `naholo skills sync-alias`, `naholo skills pull/push`, `naholo status`. Project + personal config management.

### [p26-s6: MCP & Dogfooding](p26-s6-mcp-and-dogfooding.md)

Update naholo-mcp config resolution for new config structure, add skill MCP tools, write dogfooding skills for this repo.

## Architecture Overview

### Config Hierarchy

```
~/.naholo/                          # Global (personal, all machines)
├── config.yml                      # defaultProfile pointer
└── profiles/{name}.yml             # baseUrl + user token

.naholo/                            # Project-level (in git repo)
├── config.yml                      # projectId, defaultWorkerId (committed)
├── .gitignore                      # ignores personal/
├── naholo-skill-alias-map.yml      # skill name → ID mapping
└── personal/                       # Git-ignored
    ├── personal-config.yml         # workerId for this user
    └── pulled-skills/              # Local skill working copies
        └── {name}.md              # Content + revisionId in frontmatter
```

### Skill Workflow

1. **Web UI** — Create/edit skills in the Skills settings page
2. **`naholo skills sync-alias`** — Creates lightweight SKILL.md stubs in `.claude/skills/` that fetch content on-demand
3. **`naholo skills pull [name]`** — Downloads full skill content locally for editing
4. **`naholo skills push [name]`** — Pushes local edits back to server with conflict detection
5. **Agent usage** — Claude Code invokes a skill stub → stub runs `naholo skills get [name]` → gets latest content

### Auth Model

- **User API tokens** (`naholo_user_` prefix): Personal, work across all projects. Used by CLI and MCP.
- **Worker API tokens** (`naholo_` prefix): Per-project, per-worker. Used for external integrations (bots, CI).
- CLI authenticates with user tokens; MCP reads worker identity from `.naholo/personal/personal-config.yml`.

## Prerequisites

- naholo-mcp package exists at `packages/naholo-mcp/`
- Project worker API tokens exist
- Workers page exists at `/app/projects/[projectId]/workers/`

## Notes

- Sub-plans can be implemented roughly in order, but s2 (UI) is independent of s3-s6 and can be done anytime after s1.
- s5 (CLI commands) depends on s3 (revisions) for pull/push and s4 (user auth) for login.
- s6 (MCP) depends on the config structure from s5.
