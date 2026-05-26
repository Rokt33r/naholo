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
