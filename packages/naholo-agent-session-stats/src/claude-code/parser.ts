import type {
  AgentSessionStatsError,
  ClaudeCodeTranscriptParserMappers,
  ClaudeCodeTranscriptParserOptions,
  ClaudeCodeTranscriptParserResult,
} from './types'

export class ClaudeCodeTranscriptParser {
  private readonly mappers: ClaudeCodeTranscriptParserMappers

  constructor(options: ClaudeCodeTranscriptParserOptions) {
    this.mappers = options.mappers
  }

  process(jsonl: string): ClaudeCodeTranscriptParserResult {
    const entries: ClaudeCodeTranscriptParserResult['entries'] = []
    const errors: Error[] = []

    const lines = jsonl.split('\n')
    let index = 0
    let lineNumber = 0
    for (const line of lines) {
      lineNumber += 1
      if (line.length === 0) {
        continue
      }

      let raw: unknown
      try {
        raw = JSON.parse(line)
      } catch (error) {
        if (error instanceof SyntaxError) {
          entries.push(null)
          errors.push(
            wrapAsError({
              kind: 'parse_failure',
              message: `Invalid JSON on line ${lineNumber}: ${error.message}`,
              entryIndex: index,
              lineNumber,
              path: null,
            }),
          )
          index += 1
          continue
        }
        throw error
      }

      if (raw == null || typeof raw !== 'object') {
        entries.push(null)
        errors.push(
          wrapAsError({
            kind: 'parse_failure',
            message: 'Entry is not an object',
            entryIndex: index,
            lineNumber,
            path: null,
          }),
        )
        index += 1
        continue
      }

      const typeValue = (raw as Record<string, unknown>).type
      if (typeof typeValue !== 'string') {
        entries.push(null)
        errors.push(
          wrapAsError({
            kind: 'validation_failed',
            message: 'Missing record.type',
            entryIndex: index,
            lineNumber,
            path: 'type',
          }),
        )
        index += 1
        continue
      }

      const mapper = this.mappers[typeValue]
      if (mapper == null) {
        entries.push(null)
        errors.push(
          wrapAsError({
            kind: 'unknown_entry_type',
            message: `Unknown entry type: ${typeValue}`,
            entryIndex: index,
            lineNumber,
            path: typeValue,
          }),
        )
        index += 1
        continue
      }

      try {
        const entry = mapper(raw, { index, type: typeValue })
        entries.push(entry)
      } catch (thrown) {
        entries.push(null)
        errors.push(wrapAsError(stampLineNumber(thrown, lineNumber)))
      }
      index += 1
    }

    return { entries, errors }
  }
}

function stampLineNumber(thrown: unknown, lineNumber: number): unknown {
  if (thrown != null && typeof thrown === 'object' && 'kind' in thrown) {
    ;(thrown as AgentSessionStatsError).lineNumber = lineNumber
  }
  return thrown
}

function wrapAsError(thrown: unknown): Error {
  if (thrown instanceof Error) {
    return thrown
  }
  const message = readMessage(thrown) ?? 'Mapper threw a non-Error value'
  return new Error(message, { cause: thrown })
}

function readMessage(thrown: unknown): string | null {
  if (thrown == null || typeof thrown !== 'object') {
    return null
  }
  const message = (thrown as { message?: unknown }).message
  return typeof message === 'string' ? message : null
}

// Re-exported so consumers can type-narrow `error.cause` without reaching
// into types.ts directly.
export type { AgentSessionStatsError }
