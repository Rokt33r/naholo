import 'server-only'
import { and, asc, eq, isNotNull, isNull, or } from 'drizzle-orm'
import {
  type AgentTranscriptStatsError,
  type AgentTranscriptStatsV1,
  CLAUDE_CODE_V1,
  aggregateClaudeCodeV1,
} from 'naholo-agent-transcripts/claude-code'
import { db } from '../db'
import { operationAgentTranscripts, operations, projects } from '../db/schema'
import { getFileStorageAdapter } from '../file-storage'

export type AgentTranscriptAdminListItem = {
  id: string
  transcriptId: string
  projectSlug: string
  operationNumber: number
  statsFormat: 'claude-code-v1' | null
  hasStats: boolean
  errorCount: number
}

export async function listAgentTranscriptsForAdmin(
  filter: 'unprocessed' | 'processed',
): Promise<AgentTranscriptAdminListItem[]> {
  const whereProcessed = and(
    isNotNull(operationAgentTranscripts.stats),
    isNull(operationAgentTranscripts.statsError),
  )
  const whereUnprocessed = or(
    isNull(operationAgentTranscripts.stats),
    isNotNull(operationAgentTranscripts.statsError),
  )
  const rows = await db
    .select({
      id: operationAgentTranscripts.id,
      transcriptId: operationAgentTranscripts.transcriptId,
      projectSlug: projects.slug,
      operationNumber: operations.number,
      stats: operationAgentTranscripts.stats,
      statsFormat: operationAgentTranscripts.statsFormat,
      statsError: operationAgentTranscripts.statsError,
    })
    .from(operationAgentTranscripts)
    .innerJoin(
      operations,
      eq(operations.id, operationAgentTranscripts.operationId),
    )
    .innerJoin(projects, eq(projects.id, operationAgentTranscripts.projectId))
    .where(filter === 'processed' ? whereProcessed : whereUnprocessed)
    .orderBy(asc(operationAgentTranscripts.createdAt))

  return rows.map((row) => ({
    id: row.id,
    transcriptId: row.transcriptId,
    projectSlug: row.projectSlug,
    operationNumber: row.operationNumber,
    statsFormat: row.statsFormat,
    hasStats: row.stats != null,
    errorCount: row.statsError?.length ?? 0,
  }))
}

export async function setAgentTranscriptStats(params: {
  operationId: string
  transcriptId: string
  stats: AgentTranscriptStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsError: AgentTranscriptStatsError[] | null
}): Promise<void> {
  await db
    .update(operationAgentTranscripts)
    .set({
      stats: params.stats,
      statsFormat: params.statsFormat,
      statsError: params.statsError,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationAgentTranscripts.operationId, params.operationId),
        eq(operationAgentTranscripts.transcriptId, params.transcriptId),
      ),
    )
}

export type ReprocessAgentTranscriptResult =
  | { ok: true; hasStats: boolean; errorCount: number }
  | { ok: false; reason: 'not_found' | 'no_transcript' }

export async function reprocessAgentTranscript(
  transcriptId: string,
): Promise<ReprocessAgentTranscriptResult> {
  const row = await db.query.operationAgentTranscripts.findFirst({
    where: eq(operationAgentTranscripts.transcriptId, transcriptId),
  })
  if (row == null) {
    return { ok: false, reason: 'not_found' }
  }
  if (!row.hasTranscript) {
    return { ok: false, reason: 'no_transcript' }
  }

  const key = `agent-transcripts/${row.projectId}/${row.operationId}/${row.transcriptId}`
  const transcript = await getFileStorageAdapter().getObject(key)
  const { stats, errors } = aggregateClaudeCodeV1(transcript)
  await setAgentTranscriptStats({
    operationId: row.operationId,
    transcriptId: row.transcriptId,
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
