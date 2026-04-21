import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { NaholoClient } from 'naholo-api/client'
import type { SyncObjectiveNode, Objective } from 'naholo-api/types'
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

  server.registerTool(
    'sync_objectives',
    {
      description:
        'Sync the full objective tree for an operation from OBJECTIVES.md markdown. Parses the markdown into an objective tree and sends it to the server. The server resolves positions, creates new objectives, updates existing ones, and preserves orphans.',
      inputSchema: {
        operationNumber: z
          .number()
          .int()
          .positive()
          .describe('Operation number (e.g. 3)'),
        objectivesMarkdown: z
          .string()
          .describe('Raw OBJECTIVES.md content (checkbox markdown)'),
      },
    },
    async ({ operationNumber, objectivesMarkdown }) => {
      const objectives = parseObjectivesMarkdown(objectivesMarkdown)
      const result = await client.syncObjectives(projectSlug, operationNumber, {
        objectives,
        objectiveIdsToDelete: [],
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}

const OBJECTIVE_LINE_RE =
  /^(\s*)- \[([ x])\] (.+?)(?:\s+\[ref\]\(naholo:\/\/tasks\/([^)]+)\))?$/

function parseObjectivesMarkdown(markdown: string): SyncObjectiveNode[] {
  const lines = markdown.split('\n')
  const root: SyncObjectiveNode[] = []
  // Stack tracks { node, depth } for nesting
  const stack: { node: SyncObjectiveNode; depth: number }[] = []

  for (const line of lines) {
    const match = OBJECTIVE_LINE_RE.exec(line)
    if (match == null) {
      continue
    }

    const indent = match[1].length
    const done = match[2] === 'x'
    const name = match[3].trim()
    const objectiveId = match[4] // undefined if no [ref]
    const depth = Math.floor(indent / 2)

    const node: SyncObjectiveNode = {
      ...(objectiveId != null ? { id: objectiveId } : {}),
      name,
      ...(done ? { done: true } : {}),
    }

    // Pop stack until we find the parent at depth - 1
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop()
    }

    if (stack.length === 0) {
      // Root level
      root.push(node)
    } else {
      // Child of the last item on the stack
      const parent = stack[stack.length - 1].node
      if (parent.childObjectives == null) {
        parent.childObjectives = []
      }
      parent.childObjectives.push(node)
    }

    stack.push({ node, depth })
  }

  return root
}

export function formatObjectivesMarkdown(objectives: Objective[]): string {
  const childrenMap = new Map<string | null, Objective[]>()
  for (const objective of objectives) {
    const key = objective.parentObjectiveId
    const group = childrenMap.get(key)
    if (group != null) {
      group.push(objective)
    } else {
      childrenMap.set(key, [objective])
    }
  }

  // Sort each group by position
  for (const group of childrenMap.values()) {
    group.sort((a, b) => a.position - b.position)
  }

  const lines: string[] = []

  function render(parentId: string | null, depth: number): void {
    const children = childrenMap.get(parentId)
    if (children == null) {
      return
    }
    for (const objective of children) {
      const indent = '  '.repeat(depth)
      const checkbox = objective.done ? '[x]' : '[ ]'
      lines.push(
        `${indent}- ${checkbox} ${objective.name} [ref](naholo://objectives/${objective.id})`,
      )
      render(objective.id, depth + 1)
    }
  }

  render(null, 0)
  return lines.join('\n')
}
