import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import {
  resolveLocalAgentSessionEntry,
  upsertLocalAgentSessionEntry,
} from '../../lib/agent-sessions.js'
import { readOpYml } from '../../lib/local-operations.js'

interface HookPayload {
  session_id?: unknown
  transcript_path?: unknown
}

async function readStdinJson(): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf-8').trim()
  if (raw.length === 0) {
    return null
  }
  return JSON.parse(raw)
}

export const statsRecordCommand = new Command('stats-record')
  .description(
    'Claude Code Stop hook handler: record the session in the infiled op locally',
  )
  .action(
    withErrorHandling(async () => {
      const hook = (await readStdinJson()) as HookPayload | null
      if (
        hook == null ||
        typeof hook.session_id !== 'string' ||
        typeof hook.transcript_path !== 'string'
      ) {
        return
      }
      const sessionId = hook.session_id
      const transcriptPath = hook.transcript_path

      const opYml = readOpYml()
      if (opYml == null) {
        return
      }

      const entry = await resolveLocalAgentSessionEntry({
        session_id: sessionId,
        transcript_path: transcriptPath,
      })

      upsertLocalAgentSessionEntry(entry)
    }),
  )
