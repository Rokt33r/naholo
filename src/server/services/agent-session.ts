import 'server-only'
import { eq } from 'drizzle-orm'
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
        transcriptSizeBytes: data.transcriptSizeBytes,
        updatedAt: new Date(),
      },
    })
    .returning({ id: operationAgentSessions.id })

  return ok({ id: row.id })
}

export async function setAgentSessionHasTranscript(
  id: string,
): Promise<ReturnResult<void>> {
  await db
    .update(operationAgentSessions)
    .set({ hasTranscript: true, updatedAt: new Date() })
    .where(eq(operationAgentSessions.id, id))

  return ok(undefined)
}
