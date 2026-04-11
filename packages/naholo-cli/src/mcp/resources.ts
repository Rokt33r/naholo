import {
  ResourceTemplate,
  type McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js'
import type { NaholoClient } from 'naholo-api/client'

export function registerResources(
  server: McpServer,
  client: NaholoClient,
  projectId: string,
): void {
  server.registerResource(
    'project',
    'naholo://project',
    { description: 'Current project details' },
    async (uri) => {
      const project = await client.getProject(projectId)
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
      const issues = await client.listIssues(projectId)
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
        client.getIssue(projectId, issueNumber),
        client.listTasks(projectId, issueNumber),
        client.listNotes(projectId, issueNumber),
        client.listLogs(projectId, issueNumber),
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
      const tasks = await client.listTasks(projectId, issueNumber)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(tasks, null, 2),
          },
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
      const notes = await client.listNotes(projectId, issueNumber)
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
}
