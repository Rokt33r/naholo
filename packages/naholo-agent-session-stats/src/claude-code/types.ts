// ---- Error envelope ----

export type AgentSessionStatsErrorKind =
  | 'parse_failure'
  | 'unknown_entry_type'
  | 'validation_failed'

export type AgentSessionStatsError = {
  kind: AgentSessionStatsErrorKind
  message: string
  entryIndex: number | null
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

// ---- Shared base entry ----

export interface ClaudeCodeTranscriptEntryBase {
  index: number
  timestamp: string | null
  raw: unknown
  type: string
}

// Open union — concrete variants live in the per-entry-type modules and add
// their own `type` literal + payload fields on top of the base.
export type ClaudeCodeTranscriptEntry = ClaudeCodeTranscriptEntryBase

// ---- Mapper types ----
//
// Mappers transform a raw JSON-parsed row into a typed entry. On invalid
// input they `throw` an `AgentSessionStatsError`-shaped envelope; the parser
// catches that and stores it on `Error.cause` when adding to `errors[]`.

export type TranscriptMapperContext = {
  index: number
  type: string
}

export type TranscriptMapper = (
  raw: unknown,
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
  entries: (ClaudeCodeTranscriptEntry | null)[]
  errors: Error[]
}
