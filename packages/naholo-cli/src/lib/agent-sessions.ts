import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import { z } from 'zod'
import { getLocalOperationDir } from './local-operations.js'

export type LocalAgentSessionEntry = z.infer<
  typeof localAgentSessionEntrySchema
>

export function getSessionsYmlPath(): string {
  return path.join(getLocalOperationDir(), 'agent-sessions.yml')
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
  const result: LocalAgentSessionEntry[] = []
  for (const entry of parsed) {
    const validated = localAgentSessionEntrySchema.safeParse(entry)
    if (validated.success) {
      result.push(validated.data)
    }
  }
  return result
}

export function upsertLocalAgentSessionEntry(
  entry: LocalAgentSessionEntry,
): void {
  const existing = readSessions()
  const next = existing.filter((e) => e.session_id !== entry.session_id)
  next.push(entry)
  writeSessions(next)
}

// Streams a Claude Code JSONL transcript for metadata only (timestamps, title)
// and returns a session entry. Op binding is implicit via the infiled-dir location.
export async function resolveLocalAgentSessionEntry(input: {
  session_id: string
  transcript_path: string
}): Promise<LocalAgentSessionEntry> {
  const { session_id, transcript_path } = input

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
    last_message_at: lastTimestamp,
  }
}

const localAgentSessionEntrySchema = z.object({
  session_id: z.string(),
  transcript_path: z.string(),
  title: z.string().nullable(),
  started_at: z.string(),
  last_message_at: z.string(),
})

function writeSessions(entries: LocalAgentSessionEntry[]): void {
  const ymlPath = getSessionsYmlPath()
  fs.mkdirSync(path.dirname(ymlPath), { recursive: true })
  fs.writeFileSync(ymlPath, yamlStringify(entries))
}
