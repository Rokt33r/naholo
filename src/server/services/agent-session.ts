import 'server-only'
import { db } from '../db'
import { operationAgentSessions } from '../db/schema'
import type { ReturnResult } from '@/lib/return-result'
import { ok } from '@/lib/return-result'

export async function upsertAgentSession(data: {
  projectId: string
  operationId: string
  projectOperatorId: string | null
  sessionId: string
  title: string | null
  startedAt: Date
  endedAt: Date
  transcript: string | null
  transcriptTruncated: boolean
  transcriptSizeBytes: number
}): Promise<ReturnResult<{ id: string }>> {
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
      transcript: data.transcript,
      transcriptTruncated: data.transcriptTruncated,
      transcriptSizeBytes: data.transcriptSizeBytes,
    })
    .onConflictDoUpdate({
      target: operationAgentSessions.sessionId,
      set: {
        projectId: data.projectId,
        operationId: data.operationId,
        projectOperatorId: data.projectOperatorId,
        title: data.title,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        transcript: data.transcript,
        transcriptTruncated: data.transcriptTruncated,
        transcriptSizeBytes: data.transcriptSizeBytes,
        updatedAt: new Date(),
      },
    })
    .returning({ id: operationAgentSessions.id })

  return ok({ id: row.id })
}
