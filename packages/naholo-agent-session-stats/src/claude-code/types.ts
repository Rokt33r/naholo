// ---- Error envelope ----

export type AgentSessionStatsErrorKind =
  | 'parse_failure'
  | 'unknown_entry_type'
  | 'validation_failed'

export type AgentSessionStatsError = {
  kind: AgentSessionStatsErrorKind
  message: string
  entryIndex: number | null
  lineNumber: number | null
  path: string | null
}

// ---- Token usage ----

export type ClaudeCodeTokenUsage = {
  inputTokens: number
  outputTokens: number
  cacheCreation5mInputTokens: number
  cacheCreation1hInputTokens: number
  cacheReadInputTokens: number
}

export type ModelTokenUsage = {
  model: string
  usage: ClaudeCodeTokenUsage
}

// ---- Entry shape ----
//
// Every parsed transcript entry has the same flat shape. `data` carries the
// strict schema's typed output when validation passes, and is `null` when the
// JSON failed to parse or the schema rejected the row. `raw` is the original
// JSONL line so renderers always have something to display. `errors` collects
// any parse / validation envelopes attached to this line. `modelUsages`
// carries token buckets extracted from this entry (assistant kind only;
// always `[]` on other kinds).

export type ClaudeCodeTranscriptEntry<
  K extends string = string,
  D = unknown,
> = {
  type: K
  data: D | null
  raw: string
  errors: AgentSessionStatsError[]
  modelUsages: ModelTokenUsage[]
}

// ---- Mapper types ----

export type TranscriptMapperContext = {
  index: number
  type: string
}

export type TranscriptMapper = (
  rawJson: unknown,
  rawLine: string,
  ctx: TranscriptMapperContext,
) => ClaudeCodeTranscriptEntry

export type ClaudeCodeTranscriptParserMappers = Record<
  string,
  TranscriptMapper | undefined
>

export type ClaudeCodeTranscriptParserOptions = {
  mappers: ClaudeCodeTranscriptParserMappers
}

export type ClaudeCodeTranscriptParserResult = {
  entries: ClaudeCodeTranscriptEntry[]
}
