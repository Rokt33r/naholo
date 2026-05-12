import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import { getLocalOperationDir } from './local-operations.js'

export interface LocalAgentSessionEntry {
  session_id: string
  transcript_path: string
  title: string | null
  started_at: string
  ended_at: string
  size_bytes: number
}

export function getSessionsYmlPath(): string {
  return path.join(getLocalOperationDir(), 'sessions.yml')
}

export function readSessions(): LocalAgentSessionEntry[] {
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
    (entry): entry is LocalAgentSessionEntry =>
      entry != null &&
      typeof entry === 'object' &&
      typeof entry.session_id === 'string' &&
      typeof entry.transcript_path === 'string' &&
      typeof entry.started_at === 'string' &&
      typeof entry.ended_at === 'string' &&
      typeof entry.size_bytes === 'number',
  )
}

export function upsertLocalAgentSessionEntry(
  entry: LocalAgentSessionEntry,
): void {
  const existing = readSessions()
  const next = existing.filter((e) => e.session_id !== entry.session_id)
  next.push(entry)
  fs.mkdirSync(path.dirname(getSessionsYmlPath()), { recursive: true })
  fs.writeFileSync(getSessionsYmlPath(), yamlStringify(next))
}

// Streams a Claude Code JSONL transcript for metadata only (timestamps, title, size)
// and returns a full local-agent-session entry.
export async function resolveLocalAgentSessionEntry(input: {
  session_id: string
  transcript_path: string
}): Promise<LocalAgentSessionEntry> {
  const { session_id, transcript_path } = input
  const stat = fs.statSync(transcript_path)
  const size_bytes = stat.size

  let firstTimestamp: string | null = null
  let lastTimestamp: string | null = null
  let title: string | null = null

  const stream = fs.createReadStream(transcript_path, { encoding: 'utf-8' })
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
      `Transcript ${transcript_path} has no timestamped JSONL entries`,
    )
  }

  return {
    session_id,
    transcript_path,
    title,
    started_at: firstTimestamp,
    ended_at: lastTimestamp,
    size_bytes,
  }
}
