import { NextResponse } from 'next/server'
import { requireAppAdmin } from '@/server/auth/permissions'
import { reprocessUnparsedAgentSessions } from '@/server/admin/agent-session-stats'

export async function POST() {
  await requireAppAdmin()
  const result = await reprocessUnparsedAgentSessions()
  return NextResponse.json(result, { status: 200 })
}
