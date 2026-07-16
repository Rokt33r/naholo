---
name: naholo-doctor
description: Diagnose the naholo CLI setup — checks the binary, login, project init, and legacy skill stubs, then guides you through fixing each gap.
---

# Naholo Doctor — Diagnose and fix your setup

Runs a health check on the naholo CLI and walks you through whatever is missing: the binary itself, login, project init, and leftover legacy skill stubs. The skill is self-contained — it survives a missing `naholo` binary and only shells to the CLI once the binary is confirmed present.

## What to do

### 1. Confirm the `naholo` binary

Run `naholo --version`.

- **Not found / command errors** → the CLI isn't installed. Tell the user to run `npm install -g @naholo/cli`, then re-run `/naholo-doctor`. Stop here — every later step needs the binary.
- **Found** → continue.

### 2. Read the doctor payload

Run `naholo doctor` and parse its YAML payload:

```yml
version: 0.11.0
minPluginVersion: 0.1.0 # min plugin version this CLI requires
loggedIn: true
profile: profile-1a2b # null when logged out
project:
  kind: covert # covert | project | null
  slug: naholo # null when no project
legacySkillStubs: # ["scope:name", …]; absent when none found
  - project:opord
  - global:warno
```

### 3. Check plugin ↔ CLI version compatibility

Read `naholoClaudePluginVersion` and `minNaholoCliVersion` from the code fence at the top of this skill (just below the frontmatter), and compare against the payload:

- `naholoClaudePluginVersion` < payload `minPluginVersion` → the plugin is older than this CLI requires → tell the user to update the plugin: run `claude plugin marketplace update naholo` to refresh the catalog, then `claude plugin update naholo-claude-plugin@naholo` (use `--scope project` if throws an error), and restart Claude Code to apply. Then re-run `/naholo-doctor`.
- payload `version` < `minNaholoCliVersion` → the CLI is older than this plugin requires → tell the user `npm install -g @naholo/cli@latest`, then re-run `/naholo-doctor`.

If both floors hold, the plugin and CLI are compatible.

### 4. Instruct on each gap

Walk the payload and, for each gap, give the user the exact command to run. Login and init are interactive, so the user runs those themselves:

- `loggedIn: false` → `naholo login`
- `project: null` → `naholo init` (team project) or `naholo covert init` (solo / covert)
- `version` behind the latest npm release (check with `npm view @naholo/cli version`) → `npm install -g @naholo/cli@latest`

If none of these apply, tell the user the CLI is healthy.

### 5. Clean up legacy skill stubs

If `legacySkillStubs` is present, those are old `naholo install-skills` stubs that the plugin now supersedes. List them, then offer to run `naholo doctor --fix`. On the user's go-ahead, run `naholo doctor --fix` and confirm the `removedSkillStubs` it reports back.

If `legacySkillStubs` is absent, there's nothing to clean.

## Rules

- **Binary first**: if step 1 finds no `naholo`, stop — do not attempt `naholo doctor` or any other CLI call.
- **Confirm before deleting**: `naholo doctor --fix` removes stub directories; never run it without the user's go-ahead.
- **User owns interactive setup**: report the `naholo login` / `naholo init` / `naholo covert init` commands and let the user run them; don't run them for the user.
