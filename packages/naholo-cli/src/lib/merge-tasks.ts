import type { Task } from 'naholo-api/types'
import { parseTasksMarkdown } from './tasks-markdown'

export interface MergeTasksResult {
  merged: string
  updated: number
  inserted: number
}

interface LocalTask {
  name: string
  done: boolean
  id: string | undefined
  children: LocalTask[]
}

/**
 * Merge server tasks into a local TASKS.md.
 *
 * For each server task:
 * - If a local task with the same [ref] ID exists, update its name
 *   (server is authoritative for names). Preserve local done state.
 * - If no local match by ID, insert at the bottom of the parent's children.
 *
 * Local-only tasks (no [ref] or ID not on server) are preserved.
 */
export function mergeTasks(
  operationNumber: number,
  localMarkdown: string,
  serverTasks: Task[],
): MergeTasksResult {
  const localTree = buildLocalTree(localMarkdown)
  const localById = indexById(localTree)

  // Build server parent→children map
  const serverChildrenMap = new Map<string | null, Task[]>()
  for (const obj of serverTasks) {
    const key = obj.parentTaskId
    const group = serverChildrenMap.get(key)
    if (group != null) {
      group.push(obj)
    } else {
      serverChildrenMap.set(key, [obj])
    }
  }
  for (const group of serverChildrenMap.values()) {
    group.sort((a, b) => a.position - b.position)
  }

  let updated = 0
  let inserted = 0

  function mergeLevel(
    localChildren: LocalTask[],
    serverParentId: string | null,
  ): void {
    const serverChildren = serverChildrenMap.get(serverParentId) ?? []

    for (const serverObj of serverChildren) {
      const localMatch = localById.get(serverObj.id)
      if (localMatch != null) {
        // Update name from server (server is authoritative)
        if (localMatch.name !== serverObj.name) {
          localMatch.name = serverObj.name
          updated++
        }
        // Recurse into children
        mergeLevel(localMatch.children, serverObj.id)
      } else {
        // Insert new task at the bottom of this level
        const newObj: LocalTask = {
          name: serverObj.name,
          done: serverObj.done,
          id: serverObj.id,
          children: [],
        }
        localChildren.push(newObj)
        localById.set(serverObj.id, newObj)
        inserted++
        // Recurse to pick up any children of this new task
        mergeLevel(newObj.children, serverObj.id)
      }
    }
  }

  mergeLevel(localTree, null)

  const merged = renderTree(operationNumber, localTree)

  return { merged, updated, inserted }
}

function buildLocalTree(markdown: string): LocalTask[] {
  const parsed = parseTasksMarkdown(markdown)

  function convert(
    nodes: {
      id?: string
      name: string
      done?: boolean
      childTasks?: any[]
    }[],
  ): LocalTask[] {
    return nodes.map((n) => ({
      name: n.name,
      done: n.done === true,
      id: n.id,
      children: convert(n.childTasks ?? []),
    }))
  }

  return convert(parsed)
}

function indexById(tree: LocalTask[]): Map<string, LocalTask> {
  const map = new Map<string, LocalTask>()

  function walk(nodes: LocalTask[]): void {
    for (const node of nodes) {
      if (node.id != null) {
        map.set(node.id, node)
      }
      walk(node.children)
    }
  }

  walk(tree)
  return map
}

function renderTree(operationNumber: number, tree: LocalTask[]): string {
  const lines: string[] = [`# TASKS — OP #${operationNumber}`, '']

  function render(nodes: LocalTask[], depth: number): void {
    for (const node of nodes) {
      const indent = '  '.repeat(depth)
      const checkbox = node.done ? '[x]' : '[ ]'
      const ref = node.id != null ? ` [ref](naholo://tasks/${node.id})` : ''
      lines.push(`${indent}- ${checkbox} ${node.name}${ref}`)
      render(node.children, depth + 1)
    }
  }

  if (tree.length === 0) {
    lines.push('_(no tasks yet)_')
  } else {
    render(tree, 0)
  }

  lines.push('')
  return lines.join('\n')
}
