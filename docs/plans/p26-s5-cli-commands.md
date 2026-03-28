# P26-S5: CLI Commands (init, sync-alias, pull, push, status)

## Goal

Implement the CLI commands for project initialization and skill management. The CLI reads user auth from `~/.naholo/` profiles and manages project-level config in `.naholo/`.

## Prerequisites

- p26-s1 (skill storage) — DONE
- p26-s3 (skill revisions) — needed for pull/push conflict detection
- p26-s4 (user auth + CLI login) — needed for authentication

## Architecture Decisions

- **Project config** (`.naholo/config.yml`): Stores `projectId` and `defaultWorkerId`. Checked into git.
- **Personal config** (`.naholo/personal/personal-config.yml`): Stores `workerId` for the current user. Git-ignored via `.naholo/.gitignore`.
- **Skill alias map** (`.naholo/naholo-skill-alias-map.yml`): Maps skill names to IDs, tracks which `.claude/skills/` dirs are naholo-managed.
- **Pulled skills** (`.naholo/personal/pulled-skills/{name}.md`): Local working copies of skills for editing. Frontmatter includes `revisionId`.
- **Skill stubs**: `naholo skills sync-alias` creates lightweight SKILL.md files that call `naholo skills get [name]` to fetch the actual content on-demand, rather than storing full content locally.

## Config Structure

### `.naholo/config.yml` (project config, committed)

```yaml
projectId: <uuid>
defaultWorkerId: <uuid> # optional, suggested worker
```

### `.naholo/personal/personal-config.yml` (personal, git-ignored)

```yaml
workerId: <uuid>
```

### `.naholo/.gitignore`

```
personal/
```

### `.naholo/naholo-skill-alias-map.yml`

```yaml
skills:
  elaborate-plan: <skill-id>
  push-plan: <skill-id>
```

## Commands

### `naholo init`

**First time** (no `.naholo/config.yml`):

1. Read global profile (`~/.naholo/`) for auth
2. Fetch projects linked to the user (via their project worker memberships)
3. Prompt user to select a project
4. Ask which worker to use (own worker or bot workers, not other humans' workers). Default: own worker.
5. Ask to set selected worker as default worker for the project
6. Write `.naholo/config.yml` (projectId + defaultWorkerId)
7. Write `.naholo/personal/personal-config.yml` (workerId)
8. Write `.naholo/.gitignore` (ignore `personal/`)
9. Run `sync-alias` automatically

**Subsequent init** (`.naholo/config.yml` exists):

- Only need to set up personal config
- Show current personal config if exists
- Fetch project workers, pre-select `defaultWorkerId` if still valid (warn if gone)
- Ask which worker to use
- Only ask to update `defaultWorkerId` if the current one is missing
- Write/update `.naholo/personal/personal-config.yml`
- Run `sync-alias`

### `naholo skills sync-alias`

1. Fetch skill list from `GET /api/projects/{projectId}/skills` (no content — just names + IDs)
2. Read existing alias map (`.naholo/naholo-skill-alias-map.yml`)
3. For each server skill:
   - If no local `.claude/skills/{name}/SKILL.md` conflict → create stub
   - If conflict with non-naholo skill → prompt: use alternative name (`{name}--naholo`) or replace existing
   - Update alias map
4. Remove stubs for skills that no longer exist on server (only naholo-managed ones per alias map)
5. Each stub SKILL.md instructs the agent to run `naholo skills get {name}` to fetch content. If the skill doesn't exist anymore, instruct to run `naholo skills sync-alias`.

### `naholo skills pull [skill-name]`

1. Look up skill ID from alias map
2. Fetch skill with content + `revisionId` from server
3. If already pulled locally (`.naholo/personal/pulled-skills/{name}.md`):
   - Compare local `revisionId` with server's
   - If same → no-op, already up to date
   - If different (conflict) → ask user to resolve:
     - Move local to `.naholo/personal/pulled-skills/conflicted/{name}-{iso8601}.md`
     - Fetch base revision + latest revision
     - Perform 3-way diff/merge into `.naholo/personal/pulled-skills/{name}.md`
4. If not pulled yet → write to `.naholo/personal/pulled-skills/{name}.md` with `revisionId` in frontmatter

### `naholo skills push [skill-name]`

1. Read local pulled skill from `.naholo/personal/pulled-skills/{name}.md`
2. Extract `revisionId` from frontmatter
3. Fetch current `revisionId` from server
4. If matching → push update via PATCH with `expectedRevisionId`, remove local copy
5. If conflict → ask user to resolve first. If yes, trigger pull (which does the merge). If no, fail.

### `naholo status`

Show: project name, URL, worker info, number of synced skill aliases.

## Tasks

### Task 1: CLI package scaffolding

- [ ] `packages/naholo-cli/package.json` — name `naholo-cli`, bin `naholo`, deps: `commander`, `@inquirer/prompts`, `yaml`
- [ ] `packages/naholo-cli/tsconfig.json`
- [ ] `packages/naholo-cli/src/index.ts` — Commander setup with all commands
- [ ] `packages/naholo-cli/src/api-client.ts` — HTTP client using profile auth

### Task 2: `naholo init`

- [ ] `packages/naholo-cli/src/commands/init.ts` — full init flow (first time + subsequent)
- [ ] API: `GET /api/projects` endpoint returning projects for the authenticated user
- [ ] API: `GET /api/projects/[projectId]/workers` endpoint returning workers the user can select

### Task 3: `naholo skills sync-alias`

- [ ] `packages/naholo-cli/src/commands/skills-sync-alias.ts` — sync alias flow with conflict handling
- [ ] Stub SKILL.md template generation

### Task 4: `naholo skills pull` + `naholo skills push`

- [ ] `packages/naholo-cli/src/commands/skills-pull.ts` — pull with conflict detection + 3-way merge
- [ ] `packages/naholo-cli/src/commands/skills-push.ts` — push with revision check

### Task 5: `naholo status`

- [ ] `packages/naholo-cli/src/commands/status.ts` — show config summary

## Notes

- Both CLI and MCP must read `.naholo/personal/personal-config.yml` for `workerId`. If missing, error asking to run `naholo init`.
- `defaultWorkerId` in project config is a suggestion, not enforced. Personal config's `workerId` is what's actually used.
- Skill stubs are lightweight — the actual content is fetched on-demand via CLI, keeping local files small and always up-to-date.
