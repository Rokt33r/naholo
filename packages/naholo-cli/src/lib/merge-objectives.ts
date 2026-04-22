import type { Objective } from 'naholo-api/types'
import { parseObjectivesMarkdown } from './objectives-markdown.js'

export interface MergeObjectivesResult {
  merged: string
  updated: number
  inserted: number
}

interface LocalObjective {
  name: string
  done: boolean
  id: string | undefined
  children: LocalObjective[]
}

/**
 * Merge server objectives into a local OBJECTIVES.md.
 *
 * For each server objective:
 * - If a local objective with the same [ref] ID exists, update its name
 *   (server is authoritative for names). Preserve local done state.
 * - If no local match by ID, insert at the bottom of the parent's children.
 *
 * Local-only objectives (no [ref] or ID not on server) are preserved.
 */
export function mergeObjectives(
  operationNumber: number,
  localMarkdown: string,
  serverObjectives: Objective[],
): MergeObjectivesResult {
  const localTree = buildLocalTree(localMarkdown)
  const localById = indexById(localTree)

  // Build server parent→children map
  const serverChildrenMap = new Map<string | null, Objective[]>()
  for (const obj of serverObjectives) {
    const key = obj.parentObjectiveId
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
    localChildren: LocalObjective[],
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
        // Insert new objective at the bottom of this level
        const newObj: LocalObjective = {
          name: serverObj.name,
          done: serverObj.done,
          id: serverObj.id,
          children: [],
        }
        localChildren.push(newObj)
        localById.set(serverObj.id, newObj)
        inserted++
        // Recurse to pick up any children of this new objective
        mergeLevel(newObj.children, serverObj.id)
      }
    }
  }

  mergeLevel(localTree, null)

  const merged = renderTree(operationNumber, localTree)

  return { merged, updated, inserted }
}

function buildLocalTree(markdown: string): LocalObjective[] {
  const parsed = parseObjectivesMarkdown(markdown)

  function convert(
    nodes: {
      id?: string
      name: string
      done?: boolean
      childObjectives?: any[]
    }[],
  ): LocalObjective[] {
    return nodes.map((n) => ({
      name: n.name,
      done: n.done === true,
      id: n.id,
      children: convert(n.childObjectives ?? []),
    }))
  }

  return convert(parsed)
}

function indexById(tree: LocalObjective[]): Map<string, LocalObjective> {
  const map = new Map<string, LocalObjective>()

  function walk(nodes: LocalObjective[]): void {
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

function renderTree(operationNumber: number, tree: LocalObjective[]): string {
  const lines: string[] = [`# Objectives — Operation #${operationNumber}`, '']

  function render(nodes: LocalObjective[], depth: number): void {
    for (const node of nodes) {
      const indent = '  '.repeat(depth)
      const checkbox = node.done ? '[x]' : '[ ]'
      const ref =
        node.id != null ? ` [ref](naholo://objectives/${node.id})` : ''
      lines.push(`${indent}- ${checkbox} ${node.name}${ref}`)
      render(node.children, depth + 1)
    }
  }

  if (tree.length === 0) {
    lines.push('_(no objectives yet)_')
  } else {
    render(tree, 0)
  }

  lines.push('')
  return lines.join('\n')
}
