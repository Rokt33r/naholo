import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { CliError, withErrorHandling } from '../../errors.js'
import {
  drainSessions,
  resolveLocalAgentSessionEntry,
  upsertLocalAgentSessionEntry,
} from '../../lib/agent-sessions.js'
import { appendHookError } from '../../lib/hook-errors.js'
import { readOpYml } from '../../lib/local-operations.js'
import { readCovertOpsProjectConfig } from '../../covert-config.js'
import { readProjectConfig } from '../../project-config.js'

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
    'Claude Code Stop hook handler: link the current agent session to the infiled op and drain pending uploads',
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

      const projectConfig =
        readCovertOpsProjectConfig(process.cwd()) ?? readProjectConfig()
      if (projectConfig == null) {
        return
      }

      const entry = await resolveLocalAgentSessionEntry({
        session_id: sessionId,
        transcript_path: transcriptPath,
        projectSlug: projectConfig.projectSlug,
        op: opYml.number,
      })

      upsertLocalAgentSessionEntry(entry)

      let client
      try {
        client = getCliContext().client
      } catch (error) {
        if (error instanceof CliError) {
          appendHookError('claude-code-stop', error.message)
          return
        }
        throw error
      }
      const result = await drainSessions(client, new Date())
      for (const failure of result.failed) {
        appendHookError(
          'claude-code-stop',
          `upload failed for ${failure.session_id}: ${failure.error.message}`,
        )
      }
    }),
  )
