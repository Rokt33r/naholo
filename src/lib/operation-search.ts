import type { OperationListItem } from '@/hooks/use-operations'

export type OperationSearchConditions = {
  terms: string[]
  labels: string[]
  assignees: string[]
  exactOperationNumber: number | null
}

/**
 * Parse a raw search query into structured conditions. Free-text chunks become
 * title `terms`; `label:` and `assignee:` chunks become their qualifiers.
 * Quoted values (`label:"needs review"`) keep their spaces. Values are
 * lowercased for case-insensitive matching. A `#<num>` is only special when it
 * is the entire trimmed query (an exact operation lookup) — anywhere alongside
 * other terms it is treated as plain title text.
 */
export function parseOperationSearch(query: string): OperationSearchConditions {
  const exactMatch = /^#(\d+)$/.exec(query.trim())
  if (exactMatch != null) {
    return {
      terms: [],
      labels: [],
      assignees: [],
      exactOperationNumber: Number(exactMatch[1]),
    }
  }

  const terms: string[] = []
  const labels: string[] = []
  const assignees: string[] = []

  for (const token of tokenize(query)) {
    const lower = token.toLowerCase()
    if (lower.startsWith('label:')) {
      const value = lower.slice('label:'.length)
      if (value.length > 0) {
        labels.push(value)
      }
    } else if (lower.startsWith('assignee:')) {
      const value = lower.slice('assignee:'.length)
      if (value.length > 0) {
        assignees.push(value)
      }
    } else {
      terms.push(lower)
    }
  }

  return { terms, labels, assignees, exactOperationNumber: null }
}

/**
 * Match an operation against parsed conditions. A bare `#<num>` query is an
 * exact operation-number lookup. Otherwise: every title term must be a
 * substring of the title (AND), the operation must carry at least one of the
 * selected labels (OR within the group), at least one of the selected assignees
 * (OR within the group), and the three groups are combined with AND.
 */
export function matchesOperationSearch(
  operation: OperationListItem,
  conditions: OperationSearchConditions,
): boolean {
  if (conditions.exactOperationNumber != null) {
    return operation.number === conditions.exactOperationNumber
  }

  const title = operation.title.toLowerCase()
  for (const term of conditions.terms) {
    if (!title.includes(term)) {
      return false
    }
  }

  const labelNames = operation.labels.map((label) => label.name.toLowerCase())
  if (
    conditions.labels.length > 0 &&
    !conditions.labels.some((label) => labelNames.includes(label))
  ) {
    return false
  }

  const callsigns = operation.assignees.map((assignee) =>
    assignee.callsign.toLowerCase(),
  )
  if (
    conditions.assignees.length > 0 &&
    !conditions.assignees.some((assignee) => callsigns.includes(assignee))
  ) {
    return false
  }

  return true
}

/**
 * Build a `label:` / `assignee:` qualifier token for a value, quoting the value
 * when it contains whitespace so it survives tokenization.
 */
export function buildSearchToken(
  kind: 'label' | 'assignee',
  value: string,
): string {
  const formatted = /\s/.test(value) ? `"${value}"` : value
  return `${kind}:${formatted}`
}

/**
 * Toggle a `label:` / `assignee:` qualifier in a raw search string: append the
 * token when absent, strip it when already present (case-insensitive). All
 * other tokens and free-text terms are preserved (and re-quoted when they carry
 * spaces so they survive a later re-parse).
 */
export function toggleSearchToken(
  search: string,
  kind: 'label' | 'assignee',
  value: string,
): string {
  const prefix = `${kind}:`
  const targetValue = value.toLowerCase()
  const kept: string[] = []
  let found = false
  for (const token of tokenize(search)) {
    const lower = token.toLowerCase()
    if (
      lower.startsWith(prefix) &&
      lower.slice(prefix.length) === targetValue
    ) {
      found = true
      continue
    }
    kept.push(serializeToken(token))
  }
  if (!found) {
    kept.push(buildSearchToken(kind, value))
  }
  return kept.join(' ')
}

/**
 * Re-serialize a token that came out of `tokenize` (quotes already stripped) so
 * it survives a later re-parse: qualifier values and free-text terms that carry
 * whitespace get re-quoted.
 */
function serializeToken(token: string): string {
  const lower = token.toLowerCase()
  for (const prefix of ['label:', 'assignee:']) {
    if (lower.startsWith(prefix)) {
      const value = token.slice(prefix.length)
      return /\s/.test(value)
        ? `${token.slice(0, prefix.length)}"${value}"`
        : token
    }
  }
  return /\s/.test(token) ? `"${token}"` : token
}

/**
 * Split a raw query into whitespace-delimited tokens, keeping quoted spans
 * (`"needs review"`) together and dropping the quote characters themselves.
 */
function tokenize(query: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of query) {
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && /\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}
