import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import { getAgentSessionById } from '@/server/services/agent-session'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
    agentSessionId: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, agentSessionId } =
      await context.params
    const { operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )
    const agentSession = await getAgentSessionById({
      operationId: operation.id,
      agentSessionId,
    })
    if (agentSession == null) {
      return NextResponse.json(
        { error: 'not_found', resource: 'agent_session' },
        { status: 404 },
      )
    }
    return NextResponse.json(agentSession, { status: 200 })
  } catch (error) {
    return mapApiError(error)
  }
}
