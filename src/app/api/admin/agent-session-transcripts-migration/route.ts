// TEMPORARY — remove after agent-session transcript migration (OP #145) is verified in prod.
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireAppAdmin } from '@/server/auth/permissions'
import { db } from '@/server/db'
import { operationAgentSessions, operations } from '@/server/db/schema'
import { getFileStorageAdapter } from '@/server/file-storage'

const bodySchema = z.object({
  action: z.enum(['copy', 'delete']),
})

export async function POST(request: NextRequest) {
  try {
    await requireAppAdmin()

    let parsed
    try {
      parsed = bodySchema.parse(await request.json())
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid body' },
        { status: 400 },
      )
    }

    const fileStorage = getFileStorageAdapter()

    const rows = await db
      .select({
        id: operationAgentSessions.id,
        projectId: operationAgentSessions.projectId,
        operationId: operationAgentSessions.operationId,
        sessionId: operationAgentSessions.sessionId,
        operationNumber: operations.number,
      })
      .from(operationAgentSessions)
      .innerJoin(
        operations,
        eq(operationAgentSessions.operationId, operations.id),
      )
      .where(eq(operationAgentSessions.hasTranscript, true))

    if (parsed.action === 'copy') {
      let copied = 0
      let skipped = 0
      let failed = 0
      for (const row of rows) {
        const oldKey = `agent-session-transcripts/${row.projectId}/${row.operationNumber}/${row.id}`
        const newKey = `agent-session-transcripts/${row.projectId}/${row.operationId}/${row.sessionId}`
        if (oldKey === newKey) {
          skipped += 1
          continue
        }
        try {
          const body = await fileStorage.getObject(oldKey)
          await fileStorage.putObject(newKey, body)
          copied += 1
        } catch (error) {
          failed += 1
          console.error(
            `copy ${oldKey} → ${newKey} failed:`,
            error instanceof Error ? error.message : error,
          )
        }
      }
      return NextResponse.json({
        action: 'copy',
        copied,
        skipped,
        failed,
        total: rows.length,
      })
    }

    let deleted = 0
    let failed = 0
    for (const row of rows) {
      const legacyKey = `agent-session-transcripts/${row.projectId}/${row.operationNumber}/${row.id}`
      try {
        await fileStorage.deleteObject(legacyKey)
        deleted += 1
      } catch (error) {
        failed += 1
        console.error(
          `delete ${legacyKey} failed:`,
          error instanceof Error ? error.message : error,
        )
      }
    }
    return NextResponse.json({
      action: 'delete',
      deleted,
      failed,
      total: rows.length,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
