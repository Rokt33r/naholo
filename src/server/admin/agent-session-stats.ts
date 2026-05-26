import 'server-only'
import { and, asc, eq, isNotNull, isNull, or } from 'drizzle-orm'
import {
  type AgentSessionStatsError,
  type AgentSessionStatsV1,
  CLAUDE_CODE_V1,
  aggregateClaudeCodeV1,
} from 'naholo-agent-session-stats/claude-code'
import { db } from '../db'
import { operationAgentSessions, operations, projects } from '../db/schema'
import { getFileStorageAdapter } from '../file-storage'

export type AgentSessionAdminListItem = {
  id: string
  sessionId: string
  projectSlug: string
  operationNumber: number
  statsFormat: 'claude-code-v1' | null
  hasStats: boolean
  errorCount: number
}

export async function listAgentSessionsForAdmin(
  filter: 'unprocessed' | 'processed',
): Promise<AgentSessionAdminListItem[]> {
  const whereProcessed = and(
    isNotNull(operationAgentSessions.stats),
    isNull(operationAgentSessions.statsError),
  )
  const whereUnprocessed = or(
    isNull(operationAgentSessions.stats),
    isNotNull(operationAgentSessions.statsError),
  )
  const rows = await db
    .select({
      id: operationAgentSessions.id,
      sessionId: operationAgentSessions.sessionId,
      projectSlug: projects.slug,
      operationNumber: operations.number,
      stats: operationAgentSessions.stats,
      statsFormat: operationAgentSessions.statsFormat,
      statsError: operationAgentSessions.statsError,
    })
    .from(operationAgentSessions)
    .innerJoin(
      operations,
      eq(operations.id, operationAgentSessions.operationId),
    )
    .innerJoin(projects, eq(projects.id, operationAgentSessions.projectId))
    .where(filter === 'processed' ? whereProcessed : whereUnprocessed)
    .orderBy(asc(operationAgentSessions.createdAt))

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    projectSlug: row.projectSlug,
    operationNumber: row.operationNumber,
    statsFormat: row.statsFormat,
    hasStats: row.stats != null,
    errorCount: row.statsError?.length ?? 0,
  }))
}

export async function setAgentSessionStats(params: {
  operationId: string
  agentSessionSessionId: string
  stats: AgentSessionStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsError: AgentSessionStatsError[] | null
}): Promise<void> {
  await db
    .update(operationAgentSessions)
    .set({
      stats: params.stats,
      statsFormat: params.statsFormat,
      statsError: params.statsError,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationAgentSessions.operationId, params.operationId),
        eq(operationAgentSessions.sessionId, params.agentSessionSessionId),
      ),
    )
}

export type ReprocessAgentSessionResult =
  | { ok: true; hasStats: boolean; errorCount: number }
  | { ok: false; reason: 'not_found' | 'no_transcript' }

export async function reprocessAgentSession(
  agentSessionSessionId: string,
): Promise<ReprocessAgentSessionResult> {
  const row = await db.query.operationAgentSessions.findFirst({
    where: eq(operationAgentSessions.sessionId, agentSessionSessionId),
  })
  if (row == null) {
    return { ok: false, reason: 'not_found' }
  }
  if (!row.hasTranscript) {
    return { ok: false, reason: 'no_transcript' }
  }

  const key = `agent-session-transcripts/${row.projectId}/${row.operationId}/${row.sessionId}`
  const transcript = await getFileStorageAdapter().getObject(key)
  const { stats, errors } = aggregateClaudeCodeV1(transcript)
  await setAgentSessionStats({
    operationId: row.operationId,
    agentSessionSessionId: row.sessionId,
    stats,
    statsFormat: CLAUDE_CODE_V1,
    statsError: errors.length > 0 ? errors : null,
  })

  return {
    ok: true,
    hasStats: stats != null,
    errorCount: errors.length,
  }
}

export function pruneTranscriptForDownload(transcriptText: string): string {
  const out: string[] = []
  for (const line of transcriptText.split('\n')) {
    if (line.length === 0) {
      continue
    }
    let raw: unknown
    try {
      raw = JSON.parse(line)
    } catch (error) {
      if (error instanceof SyntaxError) {
        out.push(JSON.stringify({ pruneError: 'invalid_json' }))
        continue
      }
      throw error
    }
    out.push(JSON.stringify(prunedRow(raw)))
  }
  return out.join('\n') + (transcriptText.endsWith('\n') ? '\n' : '')
}

function prunedRow(raw: unknown): unknown {
  if (!isObjectRecord(raw)) {
    return { pruneError: 'non_object' }
  }
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    out[key] = redactTopLevel(key, value)
  }
  return out
}

function redactTopLevel(key: string, value: unknown): unknown {
  if (
    key === 'summary' ||
    key === 'lastPrompt' ||
    key === 'prompt' ||
    key === 'cwd' ||
    key === 'stdout' ||
    key === 'aiTitle' ||
    key === 'gitBranch'
  ) {
    return typeof value === 'string' ? redactString(value) : value
  }
  if (key === 'message' && isObjectRecord(value)) {
    return redactMessage(value)
  }
  if (key === 'attachment' && isObjectRecord(value)) {
    return redactAttachment(value)
  }
  if (key === 'toolUseResult') {
    if (typeof value === 'string') {
      return redactString(value)
    }
    if (isObjectRecord(value)) {
      return redactToolUseResult(value)
    }
  }
  if (key === 'hookErrors' && Array.isArray(value)) {
    return value.map((entry) =>
      typeof entry === 'string' ? redactString(entry) : entry,
    )
  }
  if (key === 'hookInfos' && Array.isArray(value)) {
    return value.map(redactHookInfo)
  }
  return value
}

function redactHookInfo(info: unknown): unknown {
  if (!isObjectRecord(info)) {
    return info
  }
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(info)) {
    out[key] =
      key === 'command' && typeof value === 'string'
        ? redactString(value)
        : value
  }
  return out
}

function redactMessage(
  message: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(message)) {
    out[key] = key === 'content' ? redactMessageContent(value) : value
  }
  return out
}

function redactMessageContent(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value)
  }
  if (Array.isArray(value)) {
    return value.map(redactMessageContentPart)
  }
  return value
}

function redactMessageContentPart(part: unknown): unknown {
  if (typeof part === 'string') {
    return redactString(part)
  }
  if (!isObjectRecord(part)) {
    return part
  }
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(part)) {
    if (key === 'text' || key === 'thinking' || key === 'signature') {
      out[key] = typeof value === 'string' ? redactString(value) : value
    } else if (key === 'input') {
      out[key] = redactInput(value)
    } else if (key === 'content') {
      out[key] = redactMessageContent(value)
    } else {
      out[key] = value
    }
  }
  return out
}

function redactInput(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value)
  }
  if (value != null && typeof value === 'object') {
    return REDACTION_SENTINEL
  }
  return value
}

function redactToolUseResult(
  toolUseResult: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(toolUseResult)) {
    out[key] = redactToolUseResultField(key, value)
  }
  return out
}

function redactToolUseResultField(key: string, value: unknown): unknown {
  if (key === 'content') {
    if (typeof value === 'string') {
      return redactString(value)
    }
    return redactMessageContent(value)
  }
  if (
    (key === 'filePath' ||
      key === 'stdout' ||
      key === 'stderr' ||
      key === 'text' ||
      key === 'oldString' ||
      key === 'newString' ||
      key === 'originalFile') &&
    typeof value === 'string'
  ) {
    return redactString(value)
  }
  if (key === 'lines') {
    return redactAllStrings(value)
  }
  if (isObjectRecord(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactToolUseResultField(k, v)
    }
    return out
  }
  return value
}

function redactAllStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value)
  }
  if (Array.isArray(value)) {
    return value.map(redactAllStrings)
  }
  if (isObjectRecord(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactAllStrings(v)
    }
    return out
  }
  return value
}

function redactAttachment(
  attachment: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attachment)) {
    if (
      (key === 'content' ||
        key === 'filename' ||
        key === 'snippet' ||
        key === 'stdout' ||
        key === 'stderr' ||
        key === 'command') &&
      typeof value === 'string'
    ) {
      out[key] = redactString(value)
    } else {
      out[key] = value
    }
  }
  return out
}

function redactString(value: string): string {
  return value.length === 0 ? '' : REDACTION_SENTINEL
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object'
}

const REDACTION_SENTINEL = '_redacted_'
