import type { OperationListItem } from '@/hooks/use-operations'

export type OperationSearchConditions = {
  terms: string[]
  labels: string[]
  assignees: string[]
  operationNumber: string | null
}

/**
 * Parse a raw search query into structured conditions. Free-text chunks become
 * title `terms`; `label:`, `assignee:`, and `#<number>` chunks become their
 * respective qualifiers. Quoted values (`label:"needs review"`) keep their
 * spaces. All values are lowercased for case-insensitive matching.
 */
export function parseOperationSearch(query: string): OperationSearchConditions {
  const terms: string[] = []
  const labels: string[] = []
  const assignees: string[] = []
  let operationNumber: string | null = null

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
    } else if (token.startsWith('#')) {
      const value = token.slice(1)
      if (value.length > 0) {
        operationNumber = value
      }
    } else {
      terms.push(lower)
    }
  }

  return { terms, labels, assignees, operationNumber }
}

/**
 * AND-match an operation against parsed conditions: every title term must be a
 * substring of the title, every label/assignee qualifier must match a tag on
 * the operation, and the number qualifier (when present) must prefix the
 * operation number.
 */
export function matchesOperationSearch(
  operation: OperationListItem,
  conditions: OperationSearchConditions,
): boolean {
  const title = operation.title.toLowerCase()
  for (const term of conditions.terms) {
    if (!title.includes(term)) {
      return false
    }
  }

  const labelNames = operation.labels.map((label) => label.name.toLowerCase())
  for (const label of conditions.labels) {
    if (!labelNames.includes(label)) {
      return false
    }
  }

  const callsigns = operation.assignees.map((assignee) =>
    assignee.callsign.toLowerCase(),
  )
  for (const assignee of conditions.assignees) {
    if (!callsigns.includes(assignee)) {
      return false
    }
  }

  if (
    conditions.operationNumber != null &&
    !operation.number.toString().startsWith(conditions.operationNumber)
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
