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
      return {
        content: [{ type: 'text', text: JSON.stringify(operation, null, 2) }],
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
    'create_objective',
    {
      description: 'Create a new objective in an operation',
      inputSchema: {
        operationNumber: z
          .number()
          .int()
          .positive()
          .describe('Operation number (e.g. 3)'),
        name: z.string().describe('Objective name'),
        note: z.string().optional().describe('Objective note (markdown)'),
        parentObjectiveId: z
          .string()
          .optional()
          .describe('Parent objective ID for nesting'),
        position: z.number().optional().describe('Position index'),
      },
    },
    async ({ operationNumber, name, note, parentObjectiveId, position }) => {
      const objective = await client.createObjective(
        projectSlug,
        operationNumber,
        {
          name,
          note,
          parentObjectiveId,
          position,
        },
      )
      return {
        content: [{ type: 'text', text: JSON.stringify(objective, null, 2) }],
      }
    },
  )

  server.registerTool(
    'update_objective',
    {
      description: 'Update an objective (name, note, or done status)',
      inputSchema: {
        operationNumber: z
          .number()
          .int()
          .positive()
          .describe('Operation number (e.g. 3)'),
        objectiveId: z.string().describe('Objective ID'),
        name: z.string().optional().describe('New objective name'),
        note: z.string().optional().describe('New objective note'),
        done: z.boolean().optional().describe('Mark objective done/undone'),
      },
    },
    async ({ operationNumber, objectiveId, name, note, done }) => {
      await client.updateObjective(projectSlug, operationNumber, objectiveId, {
        name,
        note,
        done,
      })
      return { content: [{ type: 'text', text: 'Objective updated.' }] }
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
