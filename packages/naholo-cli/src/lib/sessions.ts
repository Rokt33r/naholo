import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import { getLocalOperationDir } from './local-operations.js'

const MAX_TRANSCRIPT_BYTES = 5 * 1024 * 1024

export interface SessionEntry {
  session_id: string
  transcript_path: string
  title: string | null
  started_at: string
  ended_at: string
}

export function getSessionsYmlPath(): string {
  return path.join(getLocalOperationDir(), 'sessions.yml')
}

export function readSessions(): SessionEntry[] {
  const ymlPath = getSessionsYmlPath()
  if (!fs.existsSync(ymlPath)) {
    return []
  }
  const raw = fs.readFileSync(ymlPath, 'utf-8')
  const parsed = yamlParse(raw)
  if (!Array.isArray(parsed)) {
    return []
  }
  return parsed.filter(
    (entry): entry is SessionEntry =>
      entry != null &&
      typeof entry === 'object' &&
      typeof entry.session_id === 'string' &&
      typeof entry.transcript_path === 'string' &&
      typeof entry.started_at === 'string' &&
      typeof entry.ended_at === 'string',
  )
}

export function upsertSession(entry: SessionEntry): void {
  const existing = readSessions()
  const next = existing.filter((e) => e.session_id !== entry.session_id)
  next.push(entry)
  fs.mkdirSync(path.dirname(getSessionsYmlPath()), { recursive: true })
  fs.writeFileSync(getSessionsYmlPath(), yamlStringify(next))
}

export interface TranscriptMeta {
  startedAt: string
  endedAt: string
  title: string | null
  sizeBytes: number
  transcript: string | null
  truncated: boolean
}

// Streams a Claude Code JSONL transcript, last-wins for `ai-title`.
// Over the 5 MB cap, returns `transcript=null` + `truncated=true` (size still measured).
export async function extractTranscriptMeta(
  transcriptPath: string,
): Promise<TranscriptMeta> {
  const stat = fs.statSync(transcriptPath)
  const sizeBytes = stat.size
  const truncated = sizeBytes > MAX_TRANSCRIPT_BYTES

  let firstTimestamp: string | null = null
  let lastTimestamp: string | null = null
  let title: string | null = null

  const stream = fs.createReadStream(transcriptPath, { encoding: 'utf-8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  for await (const line of rl) {
    if (line.length === 0) {
      continue
    }
    let obj: unknown
    try {
      obj = JSON.parse(line)
    } catch (error) {
      if (error instanceof SyntaxError) {
        continue
      }
      throw error
    }
    if (obj == null || typeof obj !== 'object') {
      continue
    }
    const record = obj as Record<string, unknown>
    if (typeof record.timestamp === 'string') {
      if (firstTimestamp == null) {
        firstTimestamp = record.timestamp
      }
      lastTimestamp = record.timestamp
    }
    if (record.type === 'ai-title' && typeof record.aiTitle === 'string') {
      title = record.aiTitle
    }
  }

  if (firstTimestamp == null || lastTimestamp == null) {
    throw new Error(
      `Transcript ${transcriptPath} has no timestamped JSONL entries`,
    )
  }

  const transcript = truncated ? null : fs.readFileSync(transcriptPath, 'utf-8')

  return {
    startedAt: firstTimestamp,
    endedAt: lastTimestamp,
    title,
    sizeBytes,
    transcript,
    truncated,
  }
}
