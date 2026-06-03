import type {
  AgentSessionStatsError,
  ClaudeCodeTranscriptEntry,
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
    const entries: ClaudeCodeTranscriptEntry[] = []

    const lines = jsonl.split('\n')
    let index = 0
    let lineNumber = 0
    for (const line of lines) {
      lineNumber += 1
      if (line.length === 0) {
        continue
      }

      let rawJson: unknown
      try {
        rawJson = JSON.parse(line)
      } catch (error) {
        if (error instanceof SyntaxError) {
          entries.push(
            createClaudeCodeTranscriptEntry('unknown', line, {
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

      if (rawJson == null || typeof rawJson !== 'object') {
        entries.push(
          createClaudeCodeTranscriptEntry('unknown', line, {
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

      const typeValue = (rawJson as Record<string, unknown>).type
      if (typeof typeValue !== 'string') {
        entries.push(
          createClaudeCodeTranscriptEntry('unknown', line, {
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
        entries.push(
          createClaudeCodeTranscriptEntry(typeValue, line, {
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

      const entry = mapper(rawJson, line, { index, type: typeValue })
      for (const envelope of entry.errors) {
        if (envelope.lineNumber == null) {
          envelope.lineNumber = lineNumber
        }
      }
      entries.push(entry)
      index += 1
    }

    return { entries }
  }
}

function createClaudeCodeTranscriptEntry(
  type: string,
  rawLine: string,
  envelope: AgentSessionStatsError,
): ClaudeCodeTranscriptEntry {
  return {
    type,
    data: null,
    raw: rawLine,
    errors: [envelope],
    modelUsages: [],
  }
}

// Re-exported so consumers can type-narrow without reaching into types.ts.
export type { AgentSessionStatsError }
