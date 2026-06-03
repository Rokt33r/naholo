import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import {
  getAgentTranscriptByTranscriptId,
  upsertAgentTranscript,
} from '@/server/services/agent-transcript'
import { getFileStorageAdapter } from '@/server/file-storage'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
    transcriptId: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, transcriptId } = await context.params
    const { operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )
    const agentTranscript = await getAgentTranscriptByTranscriptId({
      operationId: operation.id,
      transcriptId,
    })
    if (agentTranscript == null) {
      return NextResponse.json(
        { error: 'not_found', resource: 'agent_transcript' },
        { status: 404 },
      )
    }
    return NextResponse.json(agentTranscript, { status: 200 })
  } catch (error) {
    return mapApiError(error)
  }
}

const putAgentTranscriptSchema = z.object({
  title: z.string().nullable(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
  transcript: z.string().nullable(),
  transcriptSizeBytes: z.number().int().nonnegative(),
})

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, transcriptId } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = putAgentTranscriptSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { project, operation, projectOperator } =
      await requireOperationAccess(projectSlug, operationNumber)

    const transcript = validation.data.transcript
    if (transcript != null) {
      const fileStorage = getFileStorageAdapter()
      await fileStorage.putObject(
        `agent-session-transcripts/${project.id}/${operation.id}/${transcriptId}`,
        transcript,
      )
    }

    const upserted = await upsertAgentTranscript({
      projectId: project.id,
      operationId: operation.id,
      projectOperatorId: projectOperator.id,
      transcriptId,
      title: validation.data.title,
      startedAt: new Date(validation.data.startedAt),
      endedAt: new Date(validation.data.endedAt),
      transcriptSizeBytes: validation.data.transcriptSizeBytes,
      transcriptText: transcript,
    })
    if (!upserted.success) {
      return NextResponse.json(
        { error: upserted.error.message },
        { status: 500 },
      )
    }

    return NextResponse.json(upserted.data, { status: 200 })
  } catch (error) {
    return mapApiError(error)
  }
}
