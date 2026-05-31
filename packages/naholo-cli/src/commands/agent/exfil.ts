import fs from 'node:fs'
import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { CliError, withErrorHandling } from '../../errors.js'
import { readSessions } from '../../lib/agent-sessions.js'
import { getLocalOperationDir, readOpYml } from '../../lib/local-operations.js'
import { runPush } from './push.js'

export const exfilCommand = new Command('exfil')
  .description(
    'Push, drain registered transcripts, post a one-sentence log, optionally close, and remove the infiled dir',
  )
  .option('--close', 'Close the operation after syncing')
  .action(
    withErrorHandling(async (options: { close?: boolean }) => {
      const opYml = readOpYml()
      if (opYml == null) {
        throw new CliError(
          'No infiled operation. Run "naholo agent infil <n>" first.',
        )
      }
      const opNum = opYml.number
      const close = options.close === true
      const localDir = getLocalOperationDir()
      const { client, projectSlug } = getCliContext()

      await runPush()

      const sessions = readSessions()
      for (const entry of sessions) {
        const buffer = fs.readFileSync(entry.transcript_path)
        const transcript = buffer.toString('utf-8')
        await client.recordAgentSession(projectSlug, opNum, entry.session_id, {
          title: entry.title,
          startedAt: entry.started_at,
          endedAt: entry.last_message_at,
          transcript,
          transcriptSizeBytes: buffer.byteLength,
        })
      }

      const logContent = close
        ? `Exfil — OP #${opNum} closed.`
        : `Exfil — OP #${opNum} left open.`
      await client.createOperationLog(projectSlug, opNum, {
        content: logContent,
      })

      if (close) {
        await client.closeOperation(projectSlug, opNum)
      }

      fs.rmSync(localDir, { recursive: true, force: true })

      console.log(`Exfiled operation #${opNum}`)
    }),
  )
