import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { NaholoClient } from 'naholo-api/client'
import { z } from 'zod'

export function registerTools(
  server: McpServer,
  client: NaholoClient,
  projectSlug: string,
): void {
  server.registerTool(
    'create_operation',
    {
      description: 'Create a new operation',
      inputSchema: { title: z.string().describe('Operation title') },
    },
    async ({ title }) => {
      const operation = await client.createOperation(projectSlug, { title })
      const url = `${client.baseUrl}/app/projects/${projectSlug}/operations/${operation.number}`
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ...operation, url }, null, 2),
          },
        ],
      }
    },
  )

  server.registerTool(
    'close_operation',
    {
      description: 'Close an operation',
      inputSchema: {
        operationNumber: z
          .number()
          .int()
          .positive()
          .describe('Operation number (e.g. 3)'),
      },
    },
    async ({ operationNumber }) => {
      await client.closeOperation(projectSlug, operationNumber)
      return { content: [{ type: 'text', text: 'Operation closed.' }] }
    },
  )

  server.registerTool(
    'create_task',
    {
      description: 'Create a new task in an operation',
      inputSchema: {
        operationNumber: z
          .number()
          .int()
          .positive()
          .describe('Operation number (e.g. 3)'),
        name: z.string().describe('Task name'),
        note: z.string().optional().describe('Task note (markdown)'),
        parentTaskId: z
          .string()
          .optional()
          .describe('Parent task ID for nesting'),
        position: z.number().optional().describe('Position index'),
      },
    },
    async ({ operationNumber, name, note, parentTaskId, position }) => {
      const task = await client.createTask(projectSlug, operationNumber, {
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
        operationNumber: z
          .number()
          .int()
          .positive()
          .describe('Operation number (e.g. 3)'),
        taskId: z.string().describe('Task ID'),
        name: z.string().optional().describe('New task name'),
        note: z.string().optional().describe('New task note'),
        done: z.boolean().optional().describe('Mark task done/undone'),
      },
    },
    async ({ operationNumber, taskId, name, note, done }) => {
      await client.updateTask(projectSlug, operationNumber, taskId, {
        name,
        note,
        done,
      })
      return { content: [{ type: 'text', text: 'Task updated.' }] }
    },
  )

  server.registerTool(
    'create_note',
    {
      description: 'Create a note on an operation',
      inputSchema: {
        operationNumber: z
          .number()
          .int()
          .positive()
          .describe('Operation number (e.g. 3)'),
        name: z
          .string()
          .describe('Note name (used as identifier and filename)'),
        content: z.string().describe('Note content (markdown)'),
      },
    },
    async ({ operationNumber, name, content }) => {
      const note = await client.createNote(projectSlug, operationNumber, {
        name,
        content,
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
      }
    },
  )

  server.registerTool(
    'update_note',
    {
      description: 'Update a note on an operation',
      inputSchema: {
        operationNumber: z
          .number()
          .int()
          .positive()
          .describe('Operation number (e.g. 3)'),
        noteName: z.string().describe('Note name'),
        name: z.string().optional().describe('New note name'),
        content: z.string().optional().describe('New note content (markdown)'),
      },
    },
    async ({ operationNumber, noteName, name, content }) => {
      await client.updateNote(projectSlug, operationNumber, noteName, {
        name,
        content,
      })
      return { content: [{ type: 'text', text: 'Note updated.' }] }
    },
  )

  server.registerTool(
    'create_operation_log',
    {
      description: 'Create a log entry for an operation',
      inputSchema: {
        operationNumber: z
          .number()
          .int()
          .positive()
          .describe('Operation number (e.g. 3)'),
        content: z.string().describe('Log content'),
      },
    },
    async ({ operationNumber, content }) => {
      const log = await client.createOperationLog(
        projectSlug,
        operationNumber,
        {
          content,
        },
      )
      return {
        content: [{ type: 'text', text: JSON.stringify(log, null, 2) }],
      }
    },
  )
}
