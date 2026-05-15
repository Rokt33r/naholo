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

  console.log(`Found ${rows.length} legacy transcript key(s) to delete.`)

  let deleted = 0
  let failed = 0

  for (const row of rows) {
    const legacyKey = `agent-session-transcripts/${row.projectId}/${row.operationNumber}/${row.id}`

    try {
      await fileStorage.deleteObject(legacyKey)
      deleted += 1
      console.log(`  deleted ${legacyKey}`)
    } catch (error) {
      failed += 1
      console.error(
        `  ! failed to delete ${legacyKey}:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  console.log(
    `Done. deleted=${deleted}, failed=${failed}, total=${rows.length}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Delete script failed:', error)
    process.exit(1)
  })
