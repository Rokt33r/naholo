import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import type {
  AgentTranscriptStatsError,
  AgentTranscriptStatsV1,
} from 'naholo-agent-transcripts/claude-code'
import {
  CLAUDE_CODE_V1,
  aggregateClaudeCodeV1,
} from 'naholo-agent-transcripts/claude-code'
import { db } from '../db'
import { operationAgentTranscripts } from '../db/schema'
import type { ReturnResult } from '@/lib/return-result'
import { ok } from '@/lib/return-result'
import { ConflictError, NotFoundError } from '../errors'
import { getFileStorageAdapter } from '../file-storage'

export type AgentTranscriptSummary = {
  id: string
  transcriptId: string
  title: string | null
  startedAt: string
  endedAt: string
  hasTranscript: boolean
  transcriptSizeBytes: number
  stats: AgentTranscriptStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsErrored: boolean
}

export async function upsertAgentTranscript(data: {
  projectId: string
  operationId: string
  projectOperatorId: string | null
  transcriptId: string
  title: string | null
  startedAt: Date
  endedAt: Date
  transcriptSizeBytes: number
  transcriptText: string | null
}): Promise<ReturnResult<{ id: string }>> {
  const transcriptColumns = computeTranscriptColumns(data.transcriptText)

  const [row] = await db
    .insert(operationAgentTranscripts)
    .values({
      projectId: data.projectId,
      operationId: data.operationId,
      projectOperatorId: data.projectOperatorId,
      transcriptId: data.transcriptId,
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
        operationAgentTranscripts.operationId,
        operationAgentTranscripts.transcriptId,
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
    .returning({ id: operationAgentTranscripts.id })

  return ok({ id: row.id })
}

export async function listAgentTranscriptsByOperation(
  operationId: string,
): Promise<AgentTranscriptSummary[]> {
  const rows = await db.query.operationAgentTranscripts.findMany({
    where: eq(operationAgentTranscripts.operationId, operationId),
    orderBy: asc(operationAgentTranscripts.startedAt),
  })
  return rows.map(toSummary)
}

export async function getAgentTranscriptByTranscriptId(params: {
  operationId: string
  transcriptId: string
}): Promise<AgentTranscriptSummary | null> {
  const row = await db.query.operationAgentTranscripts.findFirst({
    where: and(
      eq(operationAgentTranscripts.operationId, params.operationId),
      eq(operationAgentTranscripts.transcriptId, params.transcriptId),
    ),
  })
  return row == null ? null : toSummary(row)
}

export async function getAgentTranscriptText(params: {
  projectId: string
  operationId: string
  transcriptId: string
}): Promise<string> {
  const row = await db.query.operationAgentTranscripts.findFirst({
    where: and(
      eq(operationAgentTranscripts.operationId, params.operationId),
      eq(operationAgentTranscripts.transcriptId, params.transcriptId),
    ),
  })
  if (row == null) {
    throw new NotFoundError('agent_transcript')
  }
  if (!row.hasTranscript) {
    throw new ConflictError({
      code: 'agent_transcript_no_transcript',
      message: 'Agent transcript has no transcript body',
    })
  }

  const key = `agent-transcripts/${params.projectId}/${params.operationId}/${row.transcriptId}`
  return await getFileStorageAdapter().getObject(key)
}

function toSummary(row: {
  id: string
  transcriptId: string
  title: string | null
  startedAt: Date
  endedAt: Date
  hasTranscript: boolean
  transcriptSizeBytes: number
  stats: AgentTranscriptStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsError: AgentTranscriptStatsError[] | null
}): AgentTranscriptSummary {
  return {
    id: row.id,
    transcriptId: row.transcriptId,
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

function computeTranscriptColumns(transcriptText: string | null): {
  hasTranscript: boolean
  stats: AgentTranscriptStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsError: AgentTranscriptStatsError[] | null
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
