import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import {
  resolveLocalAgentTranscriptEntry,
  upsertLocalAgentTranscriptEntry,
} from '../../lib/agent-transcripts.js'
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

export const claudeCodeStopCommand = new Command('claude-code-stop')
  .description(
    'Claude Code Stop hook handler: register the current agent session against the infiled op',
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

      if (readOpYml() == null) {
        return
      }

      const entry = await resolveLocalAgentTranscriptEntry({
        transcript_id: hook.session_id,
        transcript_path: hook.transcript_path,
      })

      upsertLocalAgentTranscriptEntry(entry)
    }),
  )
