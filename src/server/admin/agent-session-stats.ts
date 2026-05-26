import 'server-only'
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm'
import {
  type AgentSessionStatsError,
  type AgentSessionStatsV1,
  CLAUDE_CODE_V1,
  aggregateClaudeCodeV1,
} from 'naholo-agent-session-stats/claude-code'
import { db } from '../db'
import { operationAgentSessions, operations, projects } from '../db/schema'
import { getFileStorageAdapter } from '../file-storage'

export type AgentSessionStatsErrorListItem = {
  id: string
  sessionId: string
  projectSlug: string
  operationNumber: number
  hasStats: boolean
  errorCount: number
}

export async function listAgentSessionsByStatsErrorState(
  filter: 'any' | 'null',
): Promise<AgentSessionStatsErrorListItem[]> {
  const rows = await db
    .select({
      id: operationAgentSessions.id,
      sessionId: operationAgentSessions.sessionId,
      projectSlug: projects.slug,
      operationNumber: operations.number,
      stats: operationAgentSessions.stats,
      statsError: operationAgentSessions.statsError,
    })
    .from(operationAgentSessions)
    .innerJoin(
      operations,
      eq(operations.id, operationAgentSessions.operationId),
    )
    .innerJoin(projects, eq(projects.id, operationAgentSessions.projectId))
    .where(
      filter === 'any'
        ? isNotNull(operationAgentSessions.statsError)
        : isNull(operationAgentSessions.statsError),
    )
    .orderBy(asc(operationAgentSessions.createdAt))

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    projectSlug: row.projectSlug,
    operationNumber: row.operationNumber,
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
  const pruned: Record<string, unknown> = {}
  if (typeof raw.type === 'string') {
    pruned.type = raw.type
  }
  if (typeof raw.timestamp === 'string') {
    pruned.timestamp = raw.timestamp
  }
  if (typeof raw.attributionSkill === 'string') {
    pruned.attributionSkill = raw.attributionSkill
  }
  const message = raw.message
  if (isObjectRecord(message)) {
    const prunedMessage: Record<string, unknown> = {}
    if (typeof message.id === 'string') {
      prunedMessage.id = message.id
    }
    if (typeof message.model === 'string') {
      prunedMessage.model = message.model
    }
    if (isObjectRecord(message.usage)) {
      prunedMessage.usage = message.usage
    }
    if (Array.isArray(message.content)) {
      prunedMessage.content = message.content.map((part) =>
        isObjectRecord(part) && typeof part.type === 'string'
          ? { type: part.type }
          : { type: 'unknown' },
      )
    }
    pruned.message = prunedMessage
  }
  return pruned
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object'
}
