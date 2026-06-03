import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import { getAgentTranscriptText } from '@/server/services/agent-transcript'

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
    const { project, operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )
    const transcript = await getAgentTranscriptText({
      projectId: project.id,
      operationId: operation.id,
      transcriptId,
    })
    return new NextResponse(transcript, {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    return mapApiError(error)
  }
}
