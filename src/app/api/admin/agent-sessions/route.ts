import { NextRequest, NextResponse } from 'next/server'
import { requireAppAdmin } from '@/server/auth/permissions'
import { listAgentSessionsForAdmin } from '@/server/admin/agent-session-stats'

export async function GET(request: NextRequest) {
  await requireAppAdmin()
  const filterRaw = request.nextUrl.searchParams.get('filter')
  const filter = filterRaw === 'processed' ? 'processed' : 'unprocessed'
  const rows = await listAgentSessionsForAdmin(filter)
  return NextResponse.json({ rows }, { status: 200 })
}
