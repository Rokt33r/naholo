import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import { listAgentTranscriptsByOperation } from '@/server/services/agent-transcript'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )
    const transcripts = await listAgentTranscriptsByOperation(operation.id)
    const legacyShape = transcripts.map(({ transcriptId, ...rest }) => ({
      sessionId: transcriptId,
      ...rest,
    }))
    return NextResponse.json(legacyShape, { status: 200 })
  } catch (error) {
    return mapApiError(error)
  }
}
