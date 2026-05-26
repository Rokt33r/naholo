import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAppAdmin } from '@/server/auth/permissions'
import { db } from '@/server/db'
import { operationAgentSessions } from '@/server/db/schema'
import { getFileStorageAdapter } from '@/server/file-storage'
import { pruneTranscriptForDownload } from '@/server/admin/agent-session-stats'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentSessionSessionId: string }> },
) {
  await requireAppAdmin()

  const { agentSessionSessionId } = await params
  const row = await db.query.operationAgentSessions.findFirst({
    where: eq(operationAgentSessions.sessionId, agentSessionSessionId),
  })
  if (row == null) {
    return NextResponse.json(
      { error: 'not_found', resource: 'agent_session' },
      { status: 404 },
    )
  }
  if (!row.hasTranscript) {
    return NextResponse.json(
      { error: 'agent_session_no_transcript' },
      { status: 409 },
    )
  }

  const key = `agent-session-transcripts/${row.projectId}/${row.operationId}/${row.sessionId}`
  const transcript = await getFileStorageAdapter().getObject(key)
  const pruned = pruneTranscriptForDownload(transcript)

  return new NextResponse(pruned, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="${agentSessionSessionId}-pruned.jsonl"`,
    },
  })
}
