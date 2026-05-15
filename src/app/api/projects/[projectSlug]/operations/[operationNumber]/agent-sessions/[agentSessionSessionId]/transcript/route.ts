import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import { getAgentSessionTranscriptText } from '@/server/services/agent-session'

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
    const { project, operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )
    const transcript = await getAgentSessionTranscriptText({
      projectId: project.id,
      operationId: operation.id,
      agentSessionSessionId: agentSessionSessionId,
    })
    return new NextResponse(transcript, {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    return mapApiError(error)
  }
}
