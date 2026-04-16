import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { NaholoClient } from 'naholo-api/client'
import type { SyncTaskNode, Task } from 'naholo-api/types'
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
    'create_note',
    {
      description: 'Create a note on an issue',
      inputSchema: {
        issueNumber: z
          .number()
          .int()
          .positive()
          .describe('Issue number (e.g. 3)'),
        name: z
          .string()
          .describe('Note name (used as identifier and filename)'),
        content: z.string().describe('Note content (markdown)'),
      },
    },
    async ({ issueNumber, name, content }) => {
      const note = await client.createNote(projectSlug, issueNumber, {
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
      description: 'Update a note on an issue',
      inputSchema: {
        issueNumber: z
          .number()
          .int()
          .positive()
          .describe('Issue number (e.g. 3)'),
        noteName: z.string().describe('Note name'),
        name: z.string().optional().describe('New note name'),
        content: z.string().optional().describe('New note content (markdown)'),
      },
    },
    async ({ issueNumber, noteName, name, content }) => {
      await client.updateNote(projectSlug, issueNumber, noteName, {
        name,
        content,
      })
      return { content: [{ type: 'text', text: 'Note updated.' }] }
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

  server.registerTool(
    'sync_tasks',
    {
      description:
        'Sync the full task tree for an issue from TASKS.md markdown. Parses the markdown into a task tree and sends it to the server. The server resolves positions, creates new tasks, updates existing ones, and preserves orphans.',
      inputSchema: {
        issueNumber: z
          .number()
          .int()
          .positive()
          .describe('Issue number (e.g. 3)'),
        tasksMarkdown: z
          .string()
          .describe('Raw TASKS.md content (checkbox markdown)'),
      },
    },
    async ({ issueNumber, tasksMarkdown }) => {
      const tasks = parseTasksMarkdown(tasksMarkdown)
      const result = await client.syncTasks(projectSlug, issueNumber, {
        tasks,
        taskIdsToDelete: [],
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    },
  )
}

const TASK_LINE_RE =
  /^(\s*)- \[([ x])\] (.+?)(?:\s+\[ref\]\(naholo:\/\/tasks\/([^)]+)\))?$/

function parseTasksMarkdown(markdown: string): SyncTaskNode[] {
  const lines = markdown.split('\n')
  const root: SyncTaskNode[] = []
  // Stack tracks { node, depth } for nesting
  const stack: { node: SyncTaskNode; depth: number }[] = []

  for (const line of lines) {
    const match = TASK_LINE_RE.exec(line)
    if (match == null) {
      continue
    }

    const indent = match[1].length
    const done = match[2] === 'x'
    const name = match[3].trim()
    const taskId = match[4] // undefined if no [ref]
    const depth = Math.floor(indent / 2)

    const node: SyncTaskNode = {
      ...(taskId != null ? { id: taskId } : {}),
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
      if (parent.childTasks == null) {
        parent.childTasks = []
      }
      parent.childTasks.push(node)
    }

    stack.push({ node, depth })
  }

  return root
}

export function formatTasksMarkdown(tasks: Task[]): string {
  const childrenMap = new Map<string | null, Task[]>()
  for (const task of tasks) {
    const key = task.parentTaskId
    const group = childrenMap.get(key)
    if (group != null) {
      group.push(task)
    } else {
      childrenMap.set(key, [task])
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
    for (const task of children) {
      const indent = '  '.repeat(depth)
      const checkbox = task.done ? '[x]' : '[ ]'
      lines.push(
        `${indent}- ${checkbox} ${task.name} [ref](naholo://tasks/${task.id})`,
      )
      render(task.id, depth + 1)
    }
  }

  render(null, 0)
  return lines.join('\n')
}
