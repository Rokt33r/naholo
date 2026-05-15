import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import type { NaholoClient } from 'naholo-api/client'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import { z } from 'zod'
import { getNaholoLocalDir } from './local-operations.js'

export const STALE_SESSION_MS = 60 * 60 * 1000

export type LocalAgentSessionEntry = z.infer<
  typeof localAgentSessionEntrySchema
>

export function getSessionsYmlPath(): string {
  return path.join(getNaholoLocalDir(), 'agent-sessions.yml')
}

const localAgentSessionEntrySchema = z.object({
  session_id: z.string(),
  transcript_path: z.string(),
  title: z.string().nullable(),
  projectSlug: z.string(),
  op: z.number(),
  started_at: z.string(),
  last_message_at: z.string(),
  ended: z.boolean(),
})

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

function writeSessions(entries: LocalAgentSessionEntry[]): void {
  const ymlPath = getSessionsYmlPath()
  fs.mkdirSync(path.dirname(ymlPath), { recursive: true })
  fs.writeFileSync(ymlPath, yamlStringify(entries))
}

export function upsertLocalAgentSessionEntry(
  entry: LocalAgentSessionEntry,
): void {
  const existing = readSessions()
  const next = existing.filter((e) => e.session_id !== entry.session_id)
  next.push(entry)
  writeSessions(next)
}

export function removeSessions(sessionIds: string[]): void {
  if (sessionIds.length === 0) {
    return
  }
  const drop = new Set(sessionIds)
  const existing = readSessions()
  const next = existing.filter((e) => !drop.has(e.session_id))
  if (next.length === existing.length) {
    return
  }
  writeSessions(next)
}

// Streams a Claude Code JSONL transcript for metadata only (timestamps, title)
// and returns a full local-agent-session entry tagged with the supplied op context.
export async function resolveLocalAgentSessionEntry(input: {
  session_id: string
  transcript_path: string
  projectSlug: string
  op: number
}): Promise<LocalAgentSessionEntry> {
  const { session_id, transcript_path, projectSlug, op } = input

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
    projectSlug,
    op,
    started_at: firstTimestamp,
    last_message_at: lastTimestamp,
    ended: false,
  }
}

export function markSessionEnded(session_id: string): void {
  const existing = readSessions()
  const target = existing.find((e) => e.session_id === session_id)
  if (target == null) {
    return
  }
  if (target.ended) {
    return
  }
  target.ended = true
  upsertLocalAgentSessionEntry(target)
}

function isDrainable(entry: LocalAgentSessionEntry, now: Date): boolean {
  if (entry.ended) {
    return true
  }
  const lastMs = Date.parse(entry.last_message_at)
  if (Number.isNaN(lastMs)) {
    return false
  }
  return now.getTime() - lastMs > STALE_SESSION_MS
}

export async function drainSessions(
  client: NaholoClient,
  now: Date,
): Promise<{
  uploaded: string[]
  failed: Array<{ session_id: string; error: Error }>
}> {
  const entries = readSessions()
  const uploaded: string[] = []
  const failed: Array<{ session_id: string; error: Error }> = []

  for (const entry of entries) {
    if (!isDrainable(entry, now)) {
      continue
    }
    try {
      const buffer = fs.readFileSync(entry.transcript_path)
      const transcript = buffer.toString('utf-8')
      await client.recordAgentSession(
        entry.projectSlug,
        entry.op,
        entry.session_id,
        {
          title: entry.title,
          startedAt: entry.started_at,
          endedAt: entry.last_message_at,
          transcript,
          transcriptSizeBytes: buffer.byteLength,
        },
      )
      uploaded.push(entry.session_id)
    } catch (error) {
      failed.push({
        session_id: entry.session_id,
        error: error instanceof Error ? error : new Error(String(error)),
      })
    }
  }

  removeSessions(uploaded)
  return { uploaded, failed }
}
