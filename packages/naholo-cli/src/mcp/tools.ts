import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { NaholoClient } from 'naholo-api/client'
import { z } from 'zod'

export function registerTools(
  server: McpServer,
  client: NaholoClient,
  projectId: string,
): void {
  server.registerTool(
    'create_issue',
    {
      description: 'Create a new issue',
      inputSchema: { title: z.string().describe('Issue title') },
    },
    async ({ title }) => {
      const issue = await client.createIssue(projectId, { title })
      return {
        content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
      }
    },
  )

  server.registerTool(
    'close_issue',
    {
      description: 'Close an issue',
      inputSchema: { issueId: z.string().describe('Issue ID') },
    },
    async ({ issueId }) => {
      await client.closeIssue(projectId, issueId)
      return { content: [{ type: 'text', text: 'Issue closed.' }] }
    },
  )

  server.registerTool(
    'create_task',
    {
      description: 'Create a new task in an issue',
      inputSchema: {
        issueId: z.string().describe('Issue ID'),
        name: z.string().describe('Task name'),
        note: z.string().optional().describe('Task note (markdown)'),
        parentTaskId: z
          .string()
          .optional()
          .describe('Parent task ID for nesting'),
        position: z.number().optional().describe('Position index'),
      },
    },
    async ({ issueId, name, note, parentTaskId, position }) => {
      const task = await client.createTask(projectId, issueId, {
        name,
        note,
        parentTaskId,
        position,
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
      }
    },
  )

  server.registerTool(
    'update_task',
    {
      description: 'Update a task (name, note, or done status)',
      inputSchema: {
        issueId: z.string().describe('Issue ID'),
        taskId: z.string().describe('Task ID'),
        name: z.string().optional().describe('New task name'),
        note: z.string().optional().describe('New task note'),
        done: z.boolean().optional().describe('Mark task done/undone'),
      },
    },
    async ({ issueId, taskId, name, note, done }) => {
      await client.updateTask(projectId, issueId, taskId, {
        name,
        note,
        done,
      })
      return { content: [{ type: 'text', text: 'Task updated.' }] }
    },
  )

  server.registerTool(
    'create_log',
    {
      description: 'Create a log entry for an issue',
      inputSchema: {
        issueId: z.string().describe('Issue ID'),
        content: z.string().describe('Log content'),
      },
    },
    async ({ issueId, content }) => {
      const log = await client.createLog(projectId, issueId, { content })
      return {
        content: [{ type: 'text', text: JSON.stringify(log, null, 2) }],
      }
    },
  )
}
