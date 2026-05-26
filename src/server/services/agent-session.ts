import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import type {
  AgentSessionStatsError,
  AgentSessionStatsV1,
} from 'naholo-agent-session-stats/claude-code'
import {
  CLAUDE_CODE_V1,
  aggregateClaudeCodeV1,
} from 'naholo-agent-session-stats/claude-code'
import { db } from '../db'
import { operationAgentSessions } from '../db/schema'
import type { ReturnResult } from '@/lib/return-result'
import { ok } from '@/lib/return-result'
import { ConflictError, NotFoundError } from '../errors'
import { getFileStorageAdapter } from '../file-storage'

export type AgentSessionSummary = {
  id: string
  sessionId: string
  title: string | null
  startedAt: string
  endedAt: string
  hasTranscript: boolean
  transcriptSizeBytes: number
  stats: AgentSessionStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsErrored: boolean
}

function toSummary(row: {
  id: string
  sessionId: string
  title: string | null
  startedAt: Date
  endedAt: Date
  hasTranscript: boolean
  transcriptSizeBytes: number
  stats: AgentSessionStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsError: AgentSessionStatsError[] | null
}): AgentSessionSummary {
  return {
    id: row.id,
    sessionId: row.sessionId,
    title: row.title,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    hasTranscript: row.hasTranscript,
    transcriptSizeBytes: row.transcriptSizeBytes,
    stats: row.stats,
    statsFormat: row.statsFormat,
    statsErrored: row.statsError != null && row.statsError.length > 0,
  }
}

export async function upsertAgentSession(data: {
  projectId: string
  operationId: string
  projectOperatorId: string | null
  sessionId: string
  title: string | null
  startedAt: Date
  endedAt: Date
  transcriptSizeBytes: number
  transcriptText: string | null
}): Promise<ReturnResult<{ id: string }>> {
  const transcriptColumns = computeTranscriptColumns(data.transcriptText)

  const [row] = await db
    .insert(operationAgentSessions)
    .values({
      projectId: data.projectId,
      operationId: data.operationId,
      projectOperatorId: data.projectOperatorId,
      sessionId: data.sessionId,
      title: data.title,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      transcriptSizeBytes: data.transcriptSizeBytes,
      hasTranscript: transcriptColumns.hasTranscript,
      stats: transcriptColumns.stats,
      statsFormat: transcriptColumns.statsFormat,
      statsError: transcriptColumns.statsError,
    })
    .onConflictDoUpdate({
      target: [
        operationAgentSessions.operationId,
        operationAgentSessions.sessionId,
      ],
      set: {
        projectId: data.projectId,
        projectOperatorId: data.projectOperatorId,
        title: data.title,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        transcriptSizeBytes: data.transcriptSizeBytes,
        hasTranscript: transcriptColumns.hasTranscript,
        stats: transcriptColumns.stats,
        statsFormat: transcriptColumns.statsFormat,
        statsError: transcriptColumns.statsError,
        updatedAt: new Date(),
      },
    })
    .returning({ id: operationAgentSessions.id })

  return ok({ id: row.id })
}

export async function listAgentSessionsByOperation(
  operationId: string,
): Promise<AgentSessionSummary[]> {
  const rows = await db.query.operationAgentSessions.findMany({
    where: eq(operationAgentSessions.operationId, operationId),
    orderBy: asc(operationAgentSessions.startedAt),
  })
  return rows.map(toSummary)
}

export async function getAgentSessionBySessionId(params: {
  operationId: string
  agentSessionSessionId: string
}): Promise<AgentSessionSummary | null> {
  const row = await db.query.operationAgentSessions.findFirst({
    where: and(
      eq(operationAgentSessions.operationId, params.operationId),
      eq(operationAgentSessions.sessionId, params.agentSessionSessionId),
    ),
  })
  return row == null ? null : toSummary(row)
}

export async function getAgentSessionTranscriptText(params: {
  projectId: string
  operationId: string
  agentSessionSessionId: string
}): Promise<string> {
  const row = await db.query.operationAgentSessions.findFirst({
    where: and(
      eq(operationAgentSessions.operationId, params.operationId),
      eq(operationAgentSessions.sessionId, params.agentSessionSessionId),
    ),
  })
  if (row == null) {
    throw new NotFoundError('agent_session')
  }
  if (!row.hasTranscript) {
    throw new ConflictError({
      code: 'agent_session_no_transcript',
      message: 'Agent session has no transcript',
    })
  }

  const key = `agent-session-transcripts/${params.projectId}/${params.operationId}/${row.sessionId}`
  return await getFileStorageAdapter().getObject(key)
}

function computeTranscriptColumns(transcriptText: string | null): {
  hasTranscript: boolean
  stats: AgentSessionStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsError: AgentSessionStatsError[] | null
} {
  if (transcriptText == null) {
    return {
      hasTranscript: false,
      stats: null,
      statsFormat: null,
      statsError: null,
    }
  }
  const { stats, errors } = aggregateClaudeCodeV1(transcriptText)
  return {
    hasTranscript: true,
    stats,
    statsFormat: CLAUDE_CODE_V1,
    statsError: errors.length > 0 ? errors : null,
  }
}
