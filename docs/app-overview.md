# Naholo — App Overview

Naholo is a task/issue management app for documenting work, managing hierarchical tasks, and keeping logs. It uses a messenger-style interface for logging progress and is designed as a harness for AI-assisted development.

## Domain Model

```
Project
├── Workers (human or bot participants)
│   └── API Tokens (project-scoped)
├── Skill Sets
│   └── Skills (versioned Claude Code instructions)
└── Issues (sequential per-project: #1, #2, ...)
    ├── Tasks (hierarchical checklist, multi-level nesting)
    ├── Logs (chronological markdown journal)
    └── Notes (tabbed reference documents)
```

## Projects

A project is the top-level container. Each project has a unique slug (lowercase alphanumeric + hyphens) and is owned by a user. Projects contain issues, workers, and skill sets.

## Workers

Workers represent participants in a project. Two types:

| Type   | Description                                                              |
| ------ | ------------------------------------------------------------------------ |
| `user` | Linked to a human user account. Created when a user joins a project.     |
| `bot`  | No linked user account. API-only participant — interacts via API tokens. |

Roles: `admin` or `member`. Each worker can have multiple scoped API tokens (prefix `naholo_`). The token plaintext is shown once on creation; only the SHA-256 hash is stored.

## Issues

An issue is a workspace that combines tasks, logs, and notes. Issues have sequential per-project numbers (`#1`, `#2`, ...) assigned atomically on creation. Issues can be open or closed.

The issue list shows:

- Title and number
- Task progress (`completed/total`)
- Preview of the most recent log message
- Open/closed status

## Tasks

Tasks are checklist items within an issue. Each task has:

- **name** — single-line text
- **note** — optional markdown (expandable section below the task)
- **done** — boolean checkbox
- **position** — integer for ordering within parent scope
- **parentTaskId** — optional, enabling multi-level hierarchy (unlimited nesting)

The UI is a keyboard-driven outliner:

- Arrow keys navigate, `e` edits name, `n` edits note
- Alt+Arrow reorders, Tab/Shift+Tab indents/outdents
- Enter saves and creates next task, Cmd+Backspace deletes

## Logs

Logs are chronological markdown journal entries attached to an issue. They function like a messenger chat:

- Own messages appear right-aligned, others left-aligned
- Bot workers can post logs via API (appear as left-aligned messages with bot name)
- Enter sends a message, Shift+Enter adds a newline
- The close/reopen button lets you close an issue with an optional final log message
- The most recent log preview is cached on the issue for list display

## Notes

Notes are titled markdown documents attached to an issue. They appear as tabs in the issue view:

- Each note has a title and markdown content
- Tabbed UI — click tabs to switch, "Add Note" to create
- Three view modes: Editor, Split (editor + preview), Preview
- Autosave with 5-second debounce (spinner in tab during save)
- Used for reference material, specs, and documentation per issue

## Skills

Skills are reusable Claude Code instruction files managed centrally in the web UI:

- Organized into **Skill Sets** (name + slug, unique per project)
- Each skill has a name, markdown content, and full revision history
- Content uses YAML frontmatter for metadata (e.g., description)
- Install locally via CLI: `naholo skills install` writes `.claude/skills/{name}/SKILL.md`
- Upload from local: `naholo skills upsert <skillSetSlug> <skillName> <filePath>`

## Auth

| Method            | Use case                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Google OAuth      | Web sign-in                                                                                    |
| Email OTP         | Web sign-in (alternative)                                                                      |
| CLI device flow   | CLI authentication — opens browser, user confirms word-pair match, CLI receives user API token |
| User API tokens   | Personal CLI/API access (prefix `naholo_user_`)                                                |
| Worker API tokens | Project-scoped bot access (prefix `naholo_`)                                                   |
