import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import { z } from 'zod'
import { getLocalOperationDir } from './local-operations.js'

export type LocalAgentTranscriptEntry = z.infer<
  typeof localAgentTranscriptEntrySchema
>

export function getTranscriptsYmlPath(): string {
  return path.join(getLocalOperationDir(), 'agent-transcripts.yml')
}

export function readTranscripts(): LocalAgentTranscriptEntry[] {
  const ymlPath = getTranscriptsYmlPath()
  if (!fs.existsSync(ymlPath)) {
    return []
  }
  const raw = fs.readFileSync(ymlPath, 'utf-8')
  const parsed = yamlParse(raw)
  if (!Array.isArray(parsed)) {
    return []
  }
  const result: LocalAgentTranscriptEntry[] = []
  for (const entry of parsed) {
    const validated = localAgentTranscriptEntrySchema.safeParse(entry)
    if (validated.success) {
      result.push(validated.data)
    }
  }
  return result
}

export function upsertLocalAgentTranscriptEntry(
  entry: LocalAgentTranscriptEntry,
): void {
  const existing = readTranscripts()
  const next = existing.filter((e) => e.transcript_id !== entry.transcript_id)
  next.push(entry)
  writeTranscripts(next)
}

// Streams a Claude Code JSONL transcript for metadata only (timestamps, title)
// and returns a transcript entry. Op binding is implicit via the infiled-dir location.
export async function resolveLocalAgentTranscriptEntry(input: {
  transcript_id: string
  transcript_path: string
}): Promise<LocalAgentTranscriptEntry> {
  const { transcript_id, transcript_path } = input

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
    transcript_id,
    transcript_path,
    title,
    started_at: firstTimestamp,
    last_message_at: lastTimestamp,
  }
}

const localAgentTranscriptEntrySchema = z.object({
  transcript_id: z.string(),
  transcript_path: z.string(),
  title: z.string().nullable(),
  started_at: z.string(),
  last_message_at: z.string(),
})

function writeTranscripts(entries: LocalAgentTranscriptEntry[]): void {
  const ymlPath = getTranscriptsYmlPath()
  fs.mkdirSync(path.dirname(ymlPath), { recursive: true })
  fs.writeFileSync(ymlPath, yamlStringify(entries))
}
