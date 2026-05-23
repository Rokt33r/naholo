import {
  ResourceTemplate,
  type McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js'
import type { NaholoClient } from 'naholo-api/client'
import { readOpYml } from '../lib/local-operations.js'
import { formatTasksMarkdown } from '../lib/tasks-markdown.js'
import { getActiveProfile } from '../profile.js'

export function registerResources(
  server: McpServer,
  client: NaholoClient,
  projectSlug: string,
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
      description: 'Full operation context (tasks + notes + recent logs)',
    },
    async (uri, variables) => {
      const operationNumber = variables.operationNumber as string
      const [operation, tasks, notes, logs] = await Promise.all([
        client.getOperation(projectSlug, operationNumber),
        client.listTasks(projectSlug, operationNumber),
        client.listNotes(projectSlug, operationNumber),
        client.listOperationLogs(projectSlug, operationNumber),
      ])
      const data = { operation, tasks, notes, logs }
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
    new ResourceTemplate('naholo://operations/{operationNumber}/tasks', {
      list: undefined,
    }),
    { description: 'All tasks for an operation' },
    async (uri, variables) => {
      const operationNumber = variables.operationNumber as string
      const tasks = await client.listTasks(projectSlug, operationNumber)
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
    'local-infiled',
    'naholo://local/infiled',
    { description: 'Currently infiled operation' },
    async (uri) => {
      const opYml = readOpYml()
      const text = opYml == null ? '' : `#${opYml.number} ${opYml.title}`
      return {
        contents: [{ uri: uri.href, mimeType: 'text/plain', text }],
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
    { description: 'Personality / soul text for the active CLI profile' },
    async (uri) => {
      const active = getActiveProfile()
      const soul = active?.profile.soul ?? ''
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: soul,
          },
        ],
      }
    },
  )
}
