# P24: Claude Code Integration

## Goal

Make Naholo usable from Claude Code (and other AI tools) so that an AI agent can:

- Read context from issues, tasks, notes, and logs
- Create logs as a bot worker — displayed like received messages in a chat
- Update task status (mark done, create subtasks)
- All via authenticated API calls using project-worker-scoped API tokens

## Current State

- All APIs are session/cookie-based (Kenmon) — no programmatic access
- No API token table or generation flow exists
- Existing REST APIs already cover most CRUD operations needed
- Prerequisite: P23 (Project Workers) must be completed first

## Architecture

```
Claude Code ──MCP Server──► Naholo REST API (Bearer token auth)
                                  │
                            Project Worker API Token
                                  │
                            Existing services layer
```

The MCP server is a thin wrapper that translates MCP tool calls into Naholo API requests. Each token is scoped to a project worker, so the API knows which project and worker identity to use. All business logic stays in the existing services layer.

## Steps

1. [P24-S1: API Tokens](p24-s1-api-tokens.md) — schema, auth flow, workers UI & token management
2. [P24-S2: Bot Worker Logs](p24-s2-bot-worker-logs.md) — chat-style log rendering, current worker context hook
3. [P24-S3: Fix Auth & Permissions](p24-s3-fix-auth-and-permissions.md) — admin role check for project actions, fix log creation ownership
4. [P24-S4: API Completeness](p24-s4-api-completeness.md) — new endpoints, pagination, bundled responses
5. [P24-S5: MCP Server](p24-s5-mcp-server.md) — MCP tools, resources, npm package
