---
name: patchnote
description: Draft a release patchnote for one naholo stream (web or cli) from the unreleased diff and recommend a semver bump. Use when cutting a naholo release and you want the changelog entry written before bumping the version.
argument-hint: '<web|cli>'
---

# Patchnote — draft naholo's release notes

Draft one stream's next patchnote from the commits since its last release, and recommend a semver bump. Naholo ships two independently versioned streams:

- **web** — the Next.js app, versioned by the root `package.json` (`packages/naholo-api` changes count as web changes).
- **cli** — the `@naholo/cli` package, versioned by `packages/naholo-cli/package.json` and released via `pnpm bump-cli`.

Patchnotes are raw `.md` files under `src/content/patchnotes/<stream>/`, each with `version` + `date` frontmatter; the `/patchnotes` page globs them newest-first. This skill writes one such file. It drafts and suggests only — applying the bump, committing, and tagging stay user-owned.

## Arguments

One required token: `web` or `cli` — the single stream to draft for. Anything else, including no argument, is a no-op (see step 1). Never draft both streams in one run.

## What to do

### 1. Validate the argument

If the first token is not exactly `web` or `cli`, print ``Pass `web` or `cli` — e.g. `/patchnote cli`.`` and stop. Do nothing else: no git reads, no file writes.

### 2. Resolve the release range

Branch on the stream:

- **cli**: the last release is the newest `@naholo/cli@*` tag —
  `git tag --list '@naholo/cli@*' --sort=-v:refname | head -1`.
  Range = `<tag>..HEAD`. Current version = `version` in `packages/naholo-cli/package.json`.
- **web**: the last release is the newest commit whose message is a bare semver (the web release convention) —
  `git log -1 --grep='^[0-9]\+\.[0-9]\+\.[0-9]\+$' --format=%H`.
  Range = `<commit>..HEAD`. Current version = `version` in the root `package.json`.

If no baseline is found (no `@naholo/cli@*` tag yet, or no semver-message commit), degrade gracefully: use the full history as the range and say so in the report.

### 3. Collect the stream's commits

Scope the log to the stream's paths:

- **cli**: `git log <range> --no-merges --format='%h %s' -- packages/naholo-cli/`
- **web**: `git log <range> --no-merges --format='%h %s' -- src/ packages/naholo-api/ package.json next.config.ts ':(exclude)src/app/admin/' ':(exclude)src/app/api/admin/' ':(exclude)src/server/admin/'`

The web stream **excludes the app-admin area** (`src/app/admin/`, `src/app/api/admin/`, `src/server/admin/`) — that's internal operator tooling, not user-facing release notes. The `:(exclude)` pathspecs drop commits that only touch admin; for a commit that touches both admin and user-facing code, keep it but write the bullet about the user-facing part only.

Read the diffs you need (`git show <sha>`, `git diff <range> -- <paths>`) to understand what actually changed. Ignore noise — formatting-only, dependency-bump, and chore commits don't earn a line.

### 4. Recommend a bump

From the changes, recommend `patch` / `minor` / `major` (semver) with one or two sentences of reasoning, and compute the resulting version from the current version. Do **not** apply it — `pnpm version` / `pnpm bump-cli` and the commit/tag stay user-owned.

### 5. Draft the entry

Write `src/content/patchnotes/<stream>/<newVersion>.md` using this exact shape — a one-paragraph summary so a reader grasps the release at a glance, then a flat bullet list of the individual changes:

```
---
version: <newVersion>
date: <today, YYYY-MM-DD>
---

<one or two plain sentences summarizing what this release is about>

- <change 1 — one line, user-facing, what changed and why it matters>
- <change 2>
- <change 3>
```

- `<newVersion>` is the version the recommended bump produces; `<today>` is today's date (`date +%F`).
- The summary leads; the bullets carry the specifics. Write prose, not raw commit subjects: group related commits into a single bullet, lead each bullet with the user-facing effect. The page renders this markdown as-is (the version + date come from frontmatter, so don't repeat them in the body).

**Write plainly. State facts, not impressions.** The default model voice reads as marketing copy; strip it out:

- **No em-dashes.** Use a period, a comma, or a colon instead. Split run-on sentences into separate ones.
- **No vibe adjectives.** Cut words that assert quality without a fact behind them: "sharper", "richer", "tighter", "scannable", "consistent", "powerful", "seamless", "robust". If a change is an improvement, say what it now does differently, not that it is better.
- **Full, factual sentences.** Each bullet is a complete sentence describing what changed, in plain terms. Name the command, skill, or behavior. Prefer "X now does Y instead of Z" over "X is improved".
- **Concise.** One idea per bullet. Don't re-narrate every file. Group related commits, but don't pad the sentence to sound substantial.

### 6. Report

Tell the user: the stream, the range used (and whether it degraded to full history), the recommended bump + reasoning, the drafted file path, and the command to cut the release once they're happy:

- **cli**: `pnpm bump-cli <level>`
- **web**: bump the root `package.json` version and commit it messaged as the bare version.

If the recommended bump level changes after review, rename the drafted file to match the new version.

## Rules

- **Repo-local skill**: not registered in `core-skills.ts`, not bundled into the `naholo` CLI, not installed via `naholo install-skills`. It documents naholo's own releases.
- **Drives git directly**: no `naholo agent` subcommand backs it.
- **One stream per run**: never draft both `web` and `cli` in a single invocation.
- **Drafts and suggests only**: applying the bump, committing, and tagging stay user-owned.
