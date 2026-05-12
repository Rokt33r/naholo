export type TranscriptEntryUsage = {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}

export type TranscriptEntry = {
  index: number
  type: string
  timestamp: string | null
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
    const usage = extractUsage(record)
    const summary = extractSummary(record)
    entries.push({ index, type, timestamp, usage, summary, raw })
    index += 1
  }

  return entries
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
  return {
    inputTokens: numberOrZero(u.input_tokens),
    outputTokens: numberOrZero(u.output_tokens),
    cacheCreationInputTokens: numberOrZero(u.cache_creation_input_tokens),
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
