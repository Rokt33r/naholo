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
    agentSessionSessionId: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, agentSessionSessionId } =
      await context.params
    const { operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )
    const transcript = await getAgentTranscriptByTranscriptId({
      operationId: operation.id,
      transcriptId: agentSessionSessionId,
    })
    if (transcript == null) {
      return NextResponse.json(
        { error: 'not_found', resource: 'agent_session' },
        { status: 404 },
      )
    }
    const { transcriptId, ...rest } = transcript
    return NextResponse.json(
      { sessionId: transcriptId, ...rest },
      { status: 200 },
    )
  } catch (error) {
    return mapApiError(error)
  }
}

const putAgentSessionSchema = z.object({
  title: z.string().nullable(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
  transcript: z.string().nullable(),
})

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, agentSessionSessionId } =
      await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = putAgentSessionSchema.safeParse(body)
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
        `agent-transcripts/${project.id}/${operation.id}/${agentSessionSessionId}`,
        transcript,
      )
    }

    const upserted = await upsertAgentTranscript({
      projectId: project.id,
      operationId: operation.id,
      projectOperatorId: projectOperator.id,
      transcriptId: agentSessionSessionId,
      title: validation.data.title,
      startedAt: new Date(validation.data.startedAt),
      endedAt: new Date(validation.data.endedAt),
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
