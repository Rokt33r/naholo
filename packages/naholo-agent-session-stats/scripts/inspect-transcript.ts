import { readFileSync } from 'node:fs'
import { ClaudeCodeTranscriptParser } from '../src/claude-code/index.js'
import { mapUserEntry } from '../src/claude-code/user-entry.js'
import { mapAssistantEntry } from '../src/claude-code/assistant-entry.js'
import { mapSummaryEntry } from '../src/claude-code/summary-entry.js'
import type { AgentSessionStatsError } from '../src/claude-code/types.js'

function main(): void {
  const path = process.argv[2]
  if (path == null || path.length === 0) {
    console.error(
      'Usage: pnpm --filter naholo-agent-session-stats inspect-transcript <path-to-transcript.jsonl>',
    )
    process.exit(2)
  }

  const text = readFileSync(path, 'utf8')
  const rowsTotal = countNonEmptyLines(text)

  const parser = new ClaudeCodeTranscriptParser({
    mappers: {
      user: mapUserEntry,
      assistant: mapAssistantEntry,
      summary: mapSummaryEntry,
    },
  })
  const result = parser.process(text)

  const observedEntryTypes = new Set<string>()
  for (const entry of result.entries) {
    if (entry != null) {
      observedEntryTypes.add(entry.type)
    }
  }

  let jsonErrors = 0
  let validationFailures = 0
  const unknownEntryTypes = new Set<string>()
  for (const error of result.errors) {
    const envelope = readEnvelope(error)
    if (envelope == null) {
      jsonErrors += 1
      continue
    }
    switch (envelope.kind) {
      case 'parse_failure':
        jsonErrors += 1
        break
      case 'unknown_entry_type':
        if (envelope.path != null) {
          unknownEntryTypes.add(envelope.path)
        }
        break
      case 'validation_failed':
        validationFailures += 1
        break
    }
  }

  console.log(`Coverage report — ${path}`)
  console.log(
    `  Rows total: ${rowsTotal}   JSON errors: ${jsonErrors}   validation failures: ${validationFailures}`,
  )
  console.log('')
  printSection('Entry types', observedEntryTypes, unknownEntryTypes)
  console.log('')
  if (
    unknownEntryTypes.size === 0 &&
    jsonErrors === 0 &&
    validationFailures === 0
  ) {
    console.log('  All entry types known. No JSON or validation errors.')
    process.exit(0)
  }
  const unknownTotal = unknownEntryTypes.size
  console.log(
    `  ${unknownTotal} unknown entry type${unknownTotal === 1 ? '' : 's'}, ${validationFailures} validation failure${validationFailures === 1 ? '' : 's'} — extend parser or document.`,
  )
  process.exit(1)
}

function readEnvelope(error: Error): AgentSessionStatsError | null {
  const cause = error.cause
  if (cause != null && typeof cause === 'object' && 'kind' in cause) {
    return cause as AgentSessionStatsError
  }
  return null
}

function countNonEmptyLines(text: string): number {
  let count = 0
  for (const line of text.split('\n')) {
    if (line.length > 0) {
      count += 1
    }
  }
  return count
}

function printSection(
  label: string,
  known: ReadonlySet<string>,
  unknown: ReadonlySet<string>,
): void {
  const pad = '                      '
  const knownLine = formatList(known)
  const unknownLine = formatList(unknown)
  const labelPart = `  ${label}:`.padEnd(pad.length, ' ')
  console.log(`${labelPart}observed: ${knownLine}`)
  console.log(`${pad}unknown: ${unknownLine}`)
}

function formatList(values: ReadonlySet<string>): string {
  if (values.size === 0) {
    return '(none)'
  }
  return [...values].sort().join(', ')
}

main()
