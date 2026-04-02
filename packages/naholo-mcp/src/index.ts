#!/usr/bin/env node

import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { getClient, getProjectId } from './client.js'

const server = new McpServer({
  name: 'naholo',
  version: '0.1.0',
})

// ── Tools ──────────────────────────────────────────────────────────────

server.registerTool(
  'get_project',
  { description: 'Get current project details' },
  async () => {
    const project = await getClient().getProject(getProjectId())
    return {
      content: [{ type: 'text', text: JSON.stringify(project, null, 2) }],
    }
  },
)

server.registerTool(
  'list_issues',
  {
    description: 'List issues (open by default, pass closed=true for closed)',
    inputSchema: {
      closed: z.boolean().optional().describe('Include closed issues'),
    },
  },
  async ({ closed }) => {
    const issues = await getClient().listIssues(getProjectId(), { closed })
    return {
      content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
    }
  },
)

server.registerTool(
  'get_issue',
  {
    description: 'Get a single issue by ID',
    inputSchema: { issueId: z.string().describe('Issue ID') },
  },
  async ({ issueId }) => {
    const issue = await getClient().getIssue(getProjectId(), issueId)
    return {
      content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
    }
  },
)

server.registerTool(
  'create_issue',
  {
    description: 'Create a new issue',
    inputSchema: { title: z.string().describe('Issue title') },
  },
  async ({ title }) => {
    const issue = await getClient().createIssue(getProjectId(), { title })
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
    await getClient().closeIssue(getProjectId(), issueId)
    return { content: [{ type: 'text', text: 'Issue closed.' }] }
  },
)

server.registerTool(
  'get_tasks',
  {
    description: 'Get all tasks for an issue',
    inputSchema: { issueId: z.string().describe('Issue ID') },
  },
  async ({ issueId }) => {
    const tasks = await getClient().listTasks(getProjectId(), issueId)
    return {
      content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
    }
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
    const task = await getClient().createTask(getProjectId(), issueId, {
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
    await getClient().updateTask(getProjectId(), issueId, taskId, {
      name,
      note,
      done,
    })
    return { content: [{ type: 'text', text: 'Task updated.' }] }
  },
)

server.registerTool(
  'get_notes',
  {
    description: 'Get all notes for an issue',
    inputSchema: { issueId: z.string().describe('Issue ID') },
  },
  async ({ issueId }) => {
    const notes = await getClient().listNotes(getProjectId(), issueId)
    return {
      content: [{ type: 'text', text: JSON.stringify(notes, null, 2) }],
    }
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
    const log = await getClient().createLog(getProjectId(), issueId, {
      content,
    })
    return {
      content: [{ type: 'text', text: JSON.stringify(log, null, 2) }],
    }
  },
)

// ── Resources ──────────────────────────────────────────────────────────

server.registerResource(
  'project',
  'naholo://project',
  { description: 'Current project details' },
  async (uri) => {
    const project = await getClient().getProject(getProjectId())
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
    const issues = await getClient().listIssues(getProjectId())
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
  new ResourceTemplate('naholo://issues/{issueId}', { list: undefined }),
  { description: 'Full issue context (tasks + notes + recent logs)' },
  async (uri, variables) => {
    const issueId = variables.issueId as string
    const pid = getProjectId()
    const client = getClient()
    const [issue, tasks, notes, logs] = await Promise.all([
      client.getIssue(pid, issueId),
      client.listTasks(pid, issueId),
      client.listNotes(pid, issueId),
      client.listLogs(pid, issueId),
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

// ── Start ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Fatal:', error)
  process.exit(1)
})
