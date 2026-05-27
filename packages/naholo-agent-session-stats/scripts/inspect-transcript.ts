import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getDefaultParser } from '../src/claude-code/default-parser.js'
import type { AgentSessionStatsError } from '../src/claude-code/types.js'

function main(): void {
  const arg = process.argv[2]
  if (arg == null || arg.length === 0) {
    console.error(
      'Usage: pnpm --filter naholo-agent-session-stats inspect-transcript <path-to-transcript.jsonl>',
    )
    process.exit(2)
  }

  const baseDir = process.env.INIT_CWD ?? process.cwd()
  const path = resolve(baseDir, arg)
  const text = readFileSync(path, 'utf8')
  const rowsTotal = countNonEmptyLines(text)

  const parser = getDefaultParser()
  const result = parser.process(text)

  const observedEntryTypes = new Set<string>()
  for (const entry of result.entries) {
    if (entry != null) {
      observedEntryTypes.add(entry.type)
    }
  }

  const envelopes: AgentSessionStatsError[] = []
  const unknownEntryTypes = new Set<string>()
  let jsonErrors = 0
  let validationFailures = 0
  for (const error of result.errors) {
    const envelope = readEnvelope(error)
    if (envelope == null) {
      jsonErrors += 1
      continue
    }
    envelopes.push(envelope)
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
  printErrorDetails(envelopes)
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

main()

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

function printErrorDetails(envelopes: readonly AgentSessionStatsError[]): void {
  if (envelopes.length === 0) {
    return
  }
  const buckets: Record<
    AgentSessionStatsError['kind'],
    AgentSessionStatsError[]
  > = {
    parse_failure: [],
    unknown_entry_type: [],
    validation_failed: [],
  }
  for (const env of envelopes) {
    buckets[env.kind].push(env)
  }

  const lineWidth = computeLineColumnWidth(envelopes)
  const kindWidth = 'unknown_entry_type'.length

  for (const kind of [
    'parse_failure',
    'unknown_entry_type',
    'validation_failed',
  ] as const) {
    const bucket = buckets[kind]
    if (bucket.length === 0) {
      continue
    }
    console.log(`  ${labelForKind(kind)} (${bucket.length}):`)
    for (const env of bucket) {
      const linePart = `line ${env.lineNumber ?? '?'}`.padEnd(lineWidth, ' ')
      const kindPart = env.kind.padEnd(kindWidth, ' ')
      const pathPart = env.path ?? '—'
      console.log(`    ${linePart}   ${kindPart}   ${pathPart}`)
      console.log(`      ${env.message}`)
    }
    console.log('')
  }
}

function computeLineColumnWidth(
  envelopes: readonly AgentSessionStatsError[],
): number {
  let max = 'line ?'.length
  for (const env of envelopes) {
    const w = `line ${env.lineNumber ?? '?'}`.length
    if (w > max) {
      max = w
    }
  }
  return max
}

function labelForKind(kind: AgentSessionStatsError['kind']): string {
  switch (kind) {
    case 'parse_failure':
      return 'JSON parse failures'
    case 'unknown_entry_type':
      return 'Unknown entry types'
    case 'validation_failed':
      return 'Validation failures'
  }
}
