import { NextRequest, NextResponse } from 'next/server'
import { requireAppAdmin } from '@/server/auth/permissions'
import { listAgentSessionsByStatsErrorState } from '@/server/admin/agent-session-stats'

export async function GET(request: NextRequest) {
  await requireAppAdmin()
  const filterRaw = request.nextUrl.searchParams.get('filter')
  const filter = filterRaw === 'null' ? 'null' : 'any'
  const rows = await listAgentSessionsByStatsErrorState(filter)
  return NextResponse.json({ rows }, { status: 200 })
}
