import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import { z } from 'zod'
import { getLocalOperationDir } from './local-operations.js'

export type LocalSubagentTranscriptEntry = z.infer<
  typeof localSubagentTranscriptEntrySchema
>

export type LocalAgentTranscriptEntry = z.infer<
  typeof localAgentTranscriptEntrySchema
>

export function getTranscriptsYmlPath(): string {
  return path.join(getLocalOperationDir(), 'agent-transcripts.yml')
}

export function readLocalAgentTranscriptsYml(): LocalAgentTranscriptEntry[] {
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
  const existing = readLocalAgentTranscriptsYml()
  const next = existing.filter((e) => e.transcript_id !== entry.transcript_id)
  next.push(entry)
  writeAgentTranscriptsYml(next)
}

// Lists `{dirname(parentTranscriptPath)}/subagents/agent-*.jsonl`. Returns the
// agentId + absolute path for each file; returns [] when the subagents dir is absent.
export function listSubagentTranscriptFiles(
  parentTranscriptPath: string,
): { agentId: string; transcript_path: string }[] {
  const subagentsDir = path.join(
    path.dirname(parentTranscriptPath),
    'subagents',
  )
  if (!fs.existsSync(subagentsDir)) {
    return []
  }
  const files: { agentId: string; transcript_path: string }[] = []
  for (const filename of fs.readdirSync(subagentsDir)) {
    const match = filename.match(/^agent-(.+)\.jsonl$/)
    if (match == null) {
      continue
    }
    files.push({
      agentId: match[1],
      transcript_path: path.join(subagentsDir, filename),
    })
  }
  return files
}

// Streams a Claude Code JSONL transcript and returns first/last timestamps. When
// `opts.aiTitle` is true, also extracts the most recent `ai-title` entry's value.
export async function resolveTranscriptMeta(
  transcriptPath: string,
  opts: { aiTitle?: boolean } = {},
): Promise<{
  firstTimestamp: string | null
  lastTimestamp: string | null
  title: string | null
}> {
  const collectTitle = opts.aiTitle === true
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
    if (
      collectTitle &&
      record.type === 'ai-title' &&
      typeof record.aiTitle === 'string'
    ) {
      title = record.aiTitle
    }
  }

  return { firstTimestamp, lastTimestamp, title }
}

const localSubagentTranscriptEntrySchema = z.object({
  agentId: z.string(),
  transcript_path: z.string(),
  started_at: z.string(),
  last_message_at: z.string(),
  size_bytes: z.number(),
})

const localAgentTranscriptEntrySchema = z.object({
  transcript_id: z.string(),
  transcript_path: z.string(),
  title: z.string().nullable(),
  started_at: z.string(),
  last_message_at: z.string(),
  subagents: z.array(localSubagentTranscriptEntrySchema).default([]),
})

function writeAgentTranscriptsYml(entries: LocalAgentTranscriptEntry[]): void {
  const ymlPath = getTranscriptsYmlPath()
  fs.mkdirSync(path.dirname(ymlPath), { recursive: true })
  fs.writeFileSync(ymlPath, yamlStringify(entries))
}
