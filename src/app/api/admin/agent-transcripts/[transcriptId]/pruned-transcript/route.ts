import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAppAdmin } from '@/server/auth/permissions'
import { db } from '@/server/db'
import { operationAgentTranscripts } from '@/server/db/schema'
import { getFileStorageAdapter } from '@/server/file-storage'
import { redactTranscript } from 'naholo-agent-transcripts/claude-code'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ transcriptId: string }> },
) {
  await requireAppAdmin()

  const { transcriptId } = await params
  const row = await db.query.operationAgentTranscripts.findFirst({
    where: eq(operationAgentTranscripts.transcriptId, transcriptId),
  })
  if (row == null) {
    return NextResponse.json(
      { error: 'not_found', resource: 'agent_transcript' },
      { status: 404 },
    )
  }
  if (!row.hasTranscript) {
    return NextResponse.json(
      { error: 'agent_transcript_no_transcript' },
      { status: 409 },
    )
  }

  const key = `agent-transcripts/${row.projectId}/${row.operationId}/${row.transcriptId}`
  const transcript = await getFileStorageAdapter().getObject(key)
  const redacted = redactTranscript(transcript)

  return new NextResponse(redacted, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="${transcriptId}-pruned.jsonl"`,
    },
  })
}
