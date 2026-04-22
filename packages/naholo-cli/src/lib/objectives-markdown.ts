import type { SyncObjectiveNode, Objective } from 'naholo-api/types'

const OBJECTIVE_LINE_RE =
  /^(\s*)- \[([ x])\] (.+?)(?:\s+\[ref\]\(naholo:\/\/(?:objectives|tasks)\/([^)]+)\))?$/

export function parseObjectivesMarkdown(markdown: string): SyncObjectiveNode[] {
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
