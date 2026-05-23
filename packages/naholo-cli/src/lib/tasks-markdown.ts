import type { SyncTaskNode, Task } from 'naholo-api/types'

const TASK_LINE_RE =
  /^(\s*)- \[([ x])\] (.+?)(?:\s+\[ref\]\(naholo:\/\/tasks\/([^)]+)\))?$/

export function parseTasksMarkdown(markdown: string): SyncTaskNode[] {
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
