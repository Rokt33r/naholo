import { mergeDiff3 } from 'node-diff3'

export interface MergeResult {
  merged: string
  hasConflict: boolean
}

/**
 * Three-way merge of text content using node-diff3.
 * Convention: a = local, o = base, b = server.
 * When base is not available, caller should pass local as base
 * (base == local → server wins cleanly).
 */
export function threeWayMerge(
  base: string,
  local: string,
  server: string,
): MergeResult {
  const result = mergeDiff3(local, base, server, {
    stringSeparator: /\n/,
    label: { a: 'local', b: 'server' },
  })

  return {
    merged: result.result.join('\n'),
    hasConflict: result.conflict,
  }
}
