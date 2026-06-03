import { NextResponse } from 'next/server'
import { requireAppAdmin } from '@/server/auth/permissions'
import { reprocessAgentTranscript } from '@/server/admin/agent-transcript-stats'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ transcriptId: string }> },
) {
  await requireAppAdmin()
  const { transcriptId } = await params
  const result = await reprocessAgentTranscript(transcriptId)
  if (!result.ok && result.reason === 'not_found') {
    return NextResponse.json(result, { status: 404 })
  }
  return NextResponse.json(result, { status: 200 })
}
