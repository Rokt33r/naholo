import fs from 'node:fs'
import path from 'node:path'
import {
  ResourceTemplate,
  type McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js'
import type { NaholoClient } from 'naholo-api/client'
import { getOperationsRootDir } from '../lib/local-operations.js'
import { formatObjectivesMarkdown } from '../lib/objectives-markdown.js'

export function registerResources(
  server: McpServer,
  client: NaholoClient,
  projectSlug: string,
  projectOperatorId: string,
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
    'operations',
    'naholo://operations',
    { description: 'Operation list for the project' },
    async (uri) => {
      const operations = await client.listOperations(projectSlug)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(operations, null, 2),
          },
        ],
      }
    },
  )

  server.registerResource(
    'operation',
    new ResourceTemplate('naholo://operations/{operationNumber}', {
      list: undefined,
    }),
    {
      description: 'Full operation context (objectives + notes + recent logs)',
    },
    async (uri, variables) => {
      const operationNumber = variables.operationNumber as string
      const [operation, objectives, notes, logs] = await Promise.all([
        client.getOperation(projectSlug, operationNumber),
        client.listObjectives(projectSlug, operationNumber),
        client.listNotes(projectSlug, operationNumber),
        client.listOperationLogs(projectSlug, operationNumber),
      ])
      const data = { operation, objectives, notes, logs }
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
    'objectives',
    new ResourceTemplate('naholo://operations/{operationNumber}/objectives', {
      list: undefined,
    }),
    { description: 'All objectives for an operation' },
    async (uri, variables) => {
      const operationNumber = variables.operationNumber as string
      const objectives = await client.listObjectives(
        projectSlug,
        operationNumber,
      )
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: formatObjectivesMarkdown(objectives),
          },
        ],
      }
    },
  )

  server.registerResource(
    'local-operations',
    'naholo://local/operations',
    { description: 'List of locally infiled operations' },
    async (uri) => {
      const localOperationsDir = getOperationsRootDir()
      let entries: fs.Dirent[] = []
      try {
        entries = fs.readdirSync(localOperationsDir, { withFileTypes: true })
      } catch (error) {
        if (
          error instanceof Error &&
          (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          // Directory doesn't exist — no infiled operations
        } else {
          throw error
        }
      }

      const operationNumbers = entries
        .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
        .map((e) => Number(e.name))
        .sort((a, b) => a - b)

      if (operationNumbers.length === 0) {
        return {
          contents: [{ uri: uri.href, mimeType: 'text/plain', text: '' }],
        }
      }

      const OPERATION_TITLE_RE = /^# OPERATION — Operation #\d+:\s*(.+)$/
      const lines = operationNumbers.map((num) => {
        const operationPath = path.join(
          localOperationsDir,
          String(num),
          'notes',
          'OPERATION.md',
        )
        if (!fs.existsSync(operationPath)) {
          return `#${num} (malformed - OPERATION.md doesn't exist)`
        }
        try {
          const firstLine = fs
            .readFileSync(operationPath, 'utf-8')
            .split('\n', 1)[0]
          const match = OPERATION_TITLE_RE.exec(firstLine)
          if (match != null) {
            return `#${num} ${match[1].trim()}`
          }
          return `#${num} (malformed - OPERATION.md header not recognized)`
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
    new ResourceTemplate('naholo://operations/{operationNumber}/notes', {
      list: undefined,
    }),
    { description: 'All notes for an operation' },
    async (uri, variables) => {
      const operationNumber = variables.operationNumber as string
      const notes = await client.listNotes(projectSlug, operationNumber)
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
    { description: 'Personality / soul text for the current bot operator' },
    async (uri) => {
      const operator = await client.getOperator(projectSlug, projectOperatorId)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: operator.soul ?? '',
          },
        ],
      }
    },
  )
}
