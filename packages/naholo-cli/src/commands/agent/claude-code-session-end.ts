import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { CliError, withErrorHandling } from '../../errors.js'
import { drainSessions, markSessionEnded } from '../../lib/agent-sessions.js'
import { appendHookError } from '../../lib/hook-errors.js'

interface HookPayload {
  session_id?: unknown
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

export const claudeCodeSessionEndCommand = new Command(
  'claude-code-session-end',
)
  .description(
    'Claude Code SessionEnd hook handler: mark the agent session ended and drain any ended-or-stale entries to the server',
  )
  .action(
    withErrorHandling(async () => {
      const hook = (await readStdinJson()) as HookPayload | null
      if (hook == null || typeof hook.session_id !== 'string') {
        return
      }
      markSessionEnded(hook.session_id)

      let client
      try {
        client = getCliContext().client
      } catch (error) {
        if (error instanceof CliError) {
          appendHookError('claude-code-session-end', error.message)
          return
        }
        throw error
      }
      const result = await drainSessions(client, new Date())
      for (const failure of result.failed) {
        appendHookError(
          'claude-code-session-end',
          `upload failed for ${failure.session_id}: ${failure.error.message}`,
        )
      }
    }),
  )
