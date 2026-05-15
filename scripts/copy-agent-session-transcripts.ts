import { eq } from 'drizzle-orm'
import { db } from '../src/server/db'
import { operationAgentSessions, operations } from '../src/server/db/schema'
import { getFileStorageAdapter } from '../src/server/file-storage'

async function main() {
  const fileStorage = getFileStorageAdapter()

  const rows = await db
    .select({
      id: operationAgentSessions.id,
      projectId: operationAgentSessions.projectId,
      sessionId: operationAgentSessions.sessionId,
      operationNumber: operations.number,
    })
    .from(operationAgentSessions)
    .innerJoin(
      operations,
      eq(operationAgentSessions.operationId, operations.id),
    )
    .where(eq(operationAgentSessions.hasTranscript, true))

  console.log(`Found ${rows.length} transcript(s) to copy.`)

  let copied = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    const oldKey = `agent-session-transcripts/${row.projectId}/${row.operationNumber}/${row.id}`
    const newKey = `agent-session-transcripts/${row.projectId}/${row.operationNumber}/${row.sessionId}`

    if (oldKey === newKey) {
      skipped += 1
      continue
    }

    try {
      const body = await fileStorage.getObject(oldKey)
      await fileStorage.putObject(newKey, body)
      copied += 1
      console.log(`  copied ${row.id} → ${row.sessionId}`)
    } catch (error) {
      failed += 1
      console.error(
        `  ! failed to copy ${row.id} → ${row.sessionId}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  console.log(
    `Done. copied=${copied}, skipped=${skipped}, failed=${failed}, total=${rows.length}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Copy script failed:', error)
    process.exit(1)
  })
