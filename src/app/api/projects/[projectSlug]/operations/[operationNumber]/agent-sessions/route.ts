import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import {
  setAgentSessionHasTranscript,
  upsertAgentSession,
} from '@/server/services/agent-session'
import { getFileStorageAdapter } from '@/server/file-storage'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

const upsertAgentSessionSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().nullable(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
  transcript: z.string().nullable(),
  transcriptSizeBytes: z.number().int().nonnegative(),
})

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = upsertAgentSessionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { project, operation, actualProjectOperator } =
      await requireOperationAccess(projectSlug, operationNumber)

    const upserted = await upsertAgentSession({
      projectId: project.id,
      operationId: operation.id,
      projectOperatorId: actualProjectOperator.id,
      sessionId: validation.data.sessionId,
      title: validation.data.title,
      startedAt: new Date(validation.data.startedAt),
      endedAt: new Date(validation.data.endedAt),
      transcriptSizeBytes: validation.data.transcriptSizeBytes,
    })
    if (!upserted.success) {
      return NextResponse.json(
        { error: upserted.error.message },
        { status: 500 },
      )
    }

    const transcript = validation.data.transcript
    if (transcript != null) {
      const fileStorage = getFileStorageAdapter()
      await fileStorage.putObject(
        `agent-session-transcripts/${project.id}/${operation.number}/${upserted.data.id}`,
        transcript,
      )

      const flagged = await setAgentSessionHasTranscript(upserted.data.id)
      if (!flagged.success) {
        return NextResponse.json(
          { error: flagged.error.message },
          { status: 500 },
        )
      }
    }

    return NextResponse.json(upserted.data, { status: 200 })
  } catch (error) {
    return mapApiError(error)
  }
}
