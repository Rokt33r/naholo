import { NextResponse } from 'next/server'
import { requireAppAdmin } from '@/server/auth/permissions'
import { reprocessAgentSession } from '@/server/admin/agent-session-stats'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ agentSessionSessionId: string }> },
) {
  await requireAppAdmin()
  const { agentSessionSessionId } = await params
  const result = await reprocessAgentSession(agentSessionSessionId)
  if (!result.ok && result.reason === 'not_found') {
    return NextResponse.json(result, { status: 404 })
  }
  return NextResponse.json(result, { status: 200 })
}
