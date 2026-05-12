import fs from 'node:fs'
import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { CliError, withErrorHandling } from '../../errors.js'
import { readSessions } from '../../lib/agent-sessions.js'
import { readOpYml } from '../../lib/local-operations.js'

export const uploadAgentSessionsCommand = new Command('upload-agent-sessions')
  .description(
    'Upload every locally-linked agent session for the infiled op to the server (synchronous; called by /exfil)',
  )
  .action(
    withErrorHandling(async () => {
      const opYml = readOpYml()
      if (opYml == null) {
        throw new CliError(
          'No infiled operation. Run "naholo agent infil <n>" first.',
        )
      }
      const opNum = opYml.number
      const { client, projectSlug } = getCliContext()

      const entries = readSessions()
      if (entries.length === 0) {
        console.log('No agent sessions to upload.')
        return
      }

      for (const entry of entries) {
        const buffer = fs.readFileSync(entry.transcript_path)
        const transcript = buffer.toString('utf-8')
        await client.recordAgentSession(projectSlug, opNum, {
          sessionId: entry.session_id,
          title: entry.title,
          startedAt: entry.started_at,
          endedAt: entry.ended_at,
          transcript,
          transcriptSizeBytes: buffer.byteLength,
        })
        console.log(
          `✓ uploaded ${entry.session_id} (${buffer.byteLength} bytes)`,
        )
      }

      console.log(
        `Uploaded ${entries.length} agent session(s) for op #${opNum}.`,
      )
    }),
  )
