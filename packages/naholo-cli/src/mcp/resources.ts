import fs from 'node:fs'
import path from 'node:path'
import {
  ResourceTemplate,
  type McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js'
import type { NaholoClient } from 'naholo-api/client'
import { formatTasksMarkdown } from './tools.js'

export function registerResources(
  server: McpServer,
  client: NaholoClient,
  projectSlug: string,
  projectWorkerId: string,
): void {
  server.registerResource(
    'project',
    'naholo://project',
    { description: 'Current project details' },
    async (uri) => {
      const project = await client.getProject(projectSlug)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(project, null, 2),
          },
        ],
      }
    },
  )

  server.registerResource(
    'issues',
    'naholo://issues',
    { description: 'Issue list for the project' },
    async (uri) => {
      const issues = await client.listIssues(projectSlug)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(issues, null, 2),
          },
        ],
      }
    },
  )

  server.registerResource(
    'issue',
    new ResourceTemplate('naholo://issues/{issueNumber}', { list: undefined }),
    { description: 'Full issue context (tasks + notes + recent logs)' },
    async (uri, variables) => {
      const issueNumber = variables.issueNumber as string
      const [issue, tasks, notes, logs] = await Promise.all([
        client.getIssue(projectSlug, issueNumber),
        client.listTasks(projectSlug, issueNumber),
        client.listNotes(projectSlug, issueNumber),
        client.listLogs(projectSlug, issueNumber),
      ])
      const data = { issue, tasks, notes, logs }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      }
    },
  )

  server.registerResource(
    'tasks',
    new ResourceTemplate('naholo://issues/{issueNumber}/tasks', {
      list: undefined,
    }),
    { description: 'All tasks for an issue' },
    async (uri, variables) => {
      const issueNumber = variables.issueNumber as string
      const tasks = await client.listTasks(projectSlug, issueNumber)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: formatTasksMarkdown(tasks),
          },
        ],
      }
    },
  )

  server.registerResource(
    'local-issues',
    'naholo://local/issues',
    { description: 'List of locally infiled issues' },
    async (uri) => {
      const localIssuesDir = path.resolve('.naholo', 'local', 'issues')
      let entries: fs.Dirent[] = []
      try {
        entries = fs.readdirSync(localIssuesDir, { withFileTypes: true })
      } catch (error) {
        if (
          error instanceof Error &&
          (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          // Directory doesn't exist — no infiled issues
        } else {
          throw error
        }
      }

      const issueNumbers = entries
        .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
        .map((e) => Number(e.name))
        .sort((a, b) => a - b)

      if (issueNumbers.length === 0) {
        return {
          contents: [{ uri: uri.href, mimeType: 'text/plain', text: '' }],
        }
      }

      const PLAN_TITLE_RE = /^# PLAN — Issue #\d+:\s*(.+)$/
      const lines = issueNumbers.map((num) => {
        const planPath = path.join(
          localIssuesDir,
          String(num),
          'notes',
          'PLAN.md',
        )
        if (!fs.existsSync(planPath)) {
          return `#${num} (malformed - PLAN.md doesn't exist)`
        }
        try {
          const firstLine = fs.readFileSync(planPath, 'utf-8').split('\n', 1)[0]
          const match = PLAN_TITLE_RE.exec(firstLine)
          if (match != null) {
            return `#${num} ${match[1].trim()}`
          }
          return `#${num} (malformed - PLAN.md header not recognized)`
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return `#${num} (malformed - ${message})`
        }
      })

      return {
        contents: [
          { uri: uri.href, mimeType: 'text/plain', text: lines.join('\n') },
        ],
      }
    },
  )

  server.registerResource(
    'notes',
    new ResourceTemplate('naholo://issues/{issueNumber}/notes', {
      list: undefined,
    }),
    { description: 'All notes for an issue' },
    async (uri, variables) => {
      const issueNumber = variables.issueNumber as string
      const notes = await client.listNotes(projectSlug, issueNumber)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(notes, null, 2),
          },
        ],
      }
    },
  )

  server.registerResource(
    'soul',
    'naholo://soul',
    { description: 'Personality / soul text for the current bot worker' },
    async (uri) => {
      const worker = await client.getWorker(projectSlug, projectWorkerId)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: worker.soul ?? '',
          },
        ],
      }
    },
  )
}
