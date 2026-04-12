import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { NaholoClient } from 'naholo-api/client'
import { z } from 'zod'

export function registerTools(
  server: McpServer,
  client: NaholoClient,
  projectSlug: string,
): void {
  server.registerTool(
    'create_issue',
    {
      description: 'Create a new issue',
      inputSchema: { title: z.string().describe('Issue title') },
    },
    async ({ title }) => {
      const issue = await client.createIssue(projectSlug, { title })
      return {
        content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
      }
    },
  )

  server.registerTool(
    'close_issue',
    {
      description: 'Close an issue',
      inputSchema: {
        issueNumber: z
          .number()
          .int()
          .positive()
          .describe('Issue number (e.g. 3)'),
      },
    },
    async ({ issueNumber }) => {
      await client.closeIssue(projectSlug, issueNumber)
      return { content: [{ type: 'text', text: 'Issue closed.' }] }
    },
  )

  server.registerTool(
    'create_task',
    {
      description: 'Create a new task in an issue',
      inputSchema: {
        issueNumber: z
          .number()
          .int()
          .positive()
          .describe('Issue number (e.g. 3)'),
        name: z.string().describe('Task name'),
        note: z.string().optional().describe('Task note (markdown)'),
        parentTaskId: z
          .string()
          .optional()
          .describe('Parent task ID for nesting'),
        position: z.number().optional().describe('Position index'),
      },
    },
    async ({ issueNumber, name, note, parentTaskId, position }) => {
      const task = await client.createTask(projectSlug, issueNumber, {
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
        issueNumber: z
          .number()
          .int()
          .positive()
          .describe('Issue number (e.g. 3)'),
        taskId: z.string().describe('Task ID'),
        name: z.string().optional().describe('New task name'),
        note: z.string().optional().describe('New task note'),
        done: z.boolean().optional().describe('Mark task done/undone'),
      },
    },
    async ({ issueNumber, taskId, name, note, done }) => {
      await client.updateTask(projectSlug, issueNumber, taskId, {
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
        issueNumber: z
          .number()
          .int()
          .positive()
          .describe('Issue number (e.g. 3)'),
        content: z.string().describe('Log content'),
      },
    },
    async ({ issueNumber, content }) => {
      const log = await client.createLog(projectSlug, issueNumber, { content })
      return {
        content: [{ type: 'text', text: JSON.stringify(log, null, 2) }],
      }
    },
  )
}
