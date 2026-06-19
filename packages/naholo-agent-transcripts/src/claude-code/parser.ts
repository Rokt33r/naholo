import type {
  AgentTranscriptStatsError,
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
          entries.push({
            type: 'unknown',
            lineNumber,
            data: null,
            raw: line,
            errors: [
              {
                kind: 'parse_failure',
                message: `Invalid JSON on line ${lineNumber}: ${error.message}`,
                path: null,
              },
            ],
            modelUsages: [],
          })
          continue
        }
        throw error
      }

      if (rawJson == null || typeof rawJson !== 'object') {
        entries.push({
          type: 'unknown',
          lineNumber,
          data: null,
          raw: line,
          errors: [
            {
              kind: 'parse_failure',
              message: 'Entry is not an object',
              path: null,
            },
          ],
          modelUsages: [],
        })
        continue
      }

      const typeValue = (rawJson as Record<string, unknown>).type
      if (typeof typeValue !== 'string') {
        entries.push({
          type: 'unknown',
          lineNumber,
          data: null,
          raw: line,
          errors: [
            {
              kind: 'validation_failed',
              message: 'Missing record.type',
              path: 'type',
            },
          ],
          modelUsages: [],
        })
        continue
      }

      const mapper = this.mappers[typeValue]
      if (mapper == null) {
        entries.push({
          type: typeValue,
          lineNumber,
          data: null,
          raw: line,
          errors: [
            {
              kind: 'unknown_entry_type',
              message: `Unknown entry type: ${typeValue}`,
              path: typeValue,
            },
          ],
          modelUsages: [],
        })
        continue
      }

      entries.push(mapper(rawJson, line, { type: typeValue, lineNumber }))
    }

    return { entries }
  }
}

// Re-exported so consumers can type-narrow without reaching into types.ts.
export type { AgentTranscriptStatsError }
