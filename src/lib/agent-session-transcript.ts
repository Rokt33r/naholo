export type TranscriptEntryUsage = {
  inputTokens: number
  outputTokens: number
  cacheCreation5mInputTokens: number
  cacheCreation1hInputTokens: number
  cacheReadInputTokens: number
}

export type TranscriptEntry = {
  index: number
  type: string
  timestamp: string | null
  messageId: string | null
  model: string | null
  attributionSkill: string | null
  toolUses: string[]
  usage: TranscriptEntryUsage | null
  summary: string | null
  raw: unknown
}

const SUMMARY_MAX_CHARS = 120

export function parseTranscript(jsonl: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = []
  const lines = jsonl.split('\n')
  let index = 0

  for (const line of lines) {
    if (line.length === 0) {
      continue
    }
    let raw: unknown
    try {
      raw = JSON.parse(line)
    } catch (error) {
      if (error instanceof SyntaxError) {
        continue
      }
      throw error
    }
    if (raw == null || typeof raw !== 'object') {
      continue
    }
    const record = raw as Record<string, unknown>
    const type = typeof record.type === 'string' ? record.type : 'unknown'
    const timestamp =
      typeof record.timestamp === 'string' ? record.timestamp : null
    const messageId = extractMessageId(record)
    const model = extractModel(record)
    const attributionSkill = extractAttributionSkill(record)
    const toolUses = extractToolUses(record)
    const usage = extractUsage(record)
    const summary = extractSummary(record)
    entries.push({
      index,
      type,
      timestamp,
      messageId,
      model,
      attributionSkill,
      toolUses,
      usage,
      summary,
      raw,
    })
    index += 1
  }

  return entries
}

function extractMessageId(record: Record<string, unknown>): string | null {
  const message = record.message
  if (message == null || typeof message !== 'object') {
    return null
  }
  const id = (message as Record<string, unknown>).id
  return typeof id === 'string' ? id : null
}

function extractModel(record: Record<string, unknown>): string | null {
  const message = record.message
  if (message == null || typeof message !== 'object') {
    return null
  }
  const model = (message as Record<string, unknown>).model
  return typeof model === 'string' ? model : null
}

function extractAttributionSkill(
  record: Record<string, unknown>,
): string | null {
  const value = record.attributionSkill
  return typeof value === 'string' && value.length > 0 ? value : null
}

function extractToolUses(record: Record<string, unknown>): string[] {
  const message = record.message
  if (message == null || typeof message !== 'object') {
    return []
  }
  const content = (message as Record<string, unknown>).content
  if (!Array.isArray(content)) {
    return []
  }
  const names: string[] = []
  for (const part of content) {
    if (part == null || typeof part !== 'object') {
      continue
    }
    const p = part as Record<string, unknown>
    if (p.type !== 'tool_use') {
      continue
    }
    if (typeof p.name === 'string' && p.name.length > 0) {
      names.push(p.name)
    }
  }
  return names
}

function extractUsage(
  record: Record<string, unknown>,
): TranscriptEntryUsage | null {
  const message = record.message
  if (message == null || typeof message !== 'object') {
    return null
  }
  const usage = (message as Record<string, unknown>).usage
  if (usage == null || typeof usage !== 'object') {
    return null
  }
  const u = usage as Record<string, unknown>

  const cacheCreationSplit = u.cache_creation
  let cache5m = 0
  let cache1h = 0
  if (cacheCreationSplit != null && typeof cacheCreationSplit === 'object') {
    const c = cacheCreationSplit as Record<string, unknown>
    cache5m = numberOrZero(c.ephemeral_5m_input_tokens)
    cache1h = numberOrZero(c.ephemeral_1h_input_tokens)
  } else {
    // Older transcripts only carry the flat `cache_creation_input_tokens` total —
    // charge the whole thing to the 5m bucket so cost stays approximately right
    // (5m is the cheaper of the two; understating beats inflating).
    cache5m = numberOrZero(u.cache_creation_input_tokens)
  }

  return {
    inputTokens: numberOrZero(u.input_tokens),
    outputTokens: numberOrZero(u.output_tokens),
    cacheCreation5mInputTokens: cache5m,
    cacheCreation1hInputTokens: cache1h,
    cacheReadInputTokens: numberOrZero(u.cache_read_input_tokens),
  }
}

function extractSummary(record: Record<string, unknown>): string | null {
  if (typeof record.summary === 'string') {
    return truncate(record.summary)
  }
  if (typeof record.aiTitle === 'string') {
    return truncate(record.aiTitle)
  }
  const message = record.message
  if (message == null || typeof message !== 'object') {
    return null
  }
  const content = (message as Record<string, unknown>).content
  if (typeof content === 'string') {
    return truncate(content)
  }
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part == null || typeof part !== 'object') {
        continue
      }
      const p = part as Record<string, unknown>
      if (typeof p.text === 'string') {
        return truncate(p.text)
      }
      if (typeof p.name === 'string') {
        return truncate(p.name)
      }
    }
  }
  return null
}

function truncate(value: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= SUMMARY_MAX_CHARS) {
    return trimmed
  }
  return trimmed.slice(0, SUMMARY_MAX_CHARS - 1) + '…'
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
