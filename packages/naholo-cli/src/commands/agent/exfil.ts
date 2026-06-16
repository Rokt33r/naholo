import fs from 'node:fs'
import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import {
  NoInfiledOpCliError,
  NoProjectStateCliError,
  withErrorHandling,
} from '../../errors.js'
import { getProjectState } from '../../lib/project-state.js'
import { pushOp } from '../../lib/push-op.js'

export const exfilCommand = new Command('exfil')
  .description(
    'Push, drain registered transcripts, post a one-sentence log, optionally close, and remove the infiled dir',
  )
  .option('--close', 'Close the operation after syncing')
  .action(
    withErrorHandling(async (options: { close?: boolean }) => {
      const cliContext = getCliContext()
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }
      const opYml = projectState.readOpYml()
      if (opYml == null) {
        throw new NoInfiledOpCliError()
      }
      const opNum = opYml.number
      const close = options.close === true
      const infiledDir = projectState.getInfiledDir()
      const projectSlug = projectState.config.projectSlug
      const { client, currentProfile } = cliContext
      const baseUrl = currentProfile.profile.baseUrl.replace(/\/$/, '')
      const opUrl = `${baseUrl}/app/projects/${projectSlug}/operations/${opNum}`

      await pushOp(cliContext, projectState)

      const transcripts = projectState.readLocalAgentTranscripts()
      for (const entry of transcripts) {
        const buffer = fs.readFileSync(entry.transcript_path)
        const transcript = buffer.toString('utf-8')
        await client.recordAgentTranscript(
          projectSlug,
          opNum,
          entry.transcript_id,
          {
            title: entry.title,
            startedAt: entry.started_at,
            endedAt: entry.last_message_at,
            transcript,
            transcriptSizeBytes: buffer.byteLength,
          },
        )

        for (const subagent of entry.subagents) {
          const subBuffer = fs.readFileSync(subagent.transcript_path)
          const subTranscript = subBuffer.toString('utf-8')
          const syntheticId = `${entry.transcript_id}-subagent-${subagent.agentId}`
          await client.recordAgentTranscript(projectSlug, opNum, syntheticId, {
            title: null,
            startedAt: subagent.started_at,
            endedAt: subagent.last_message_at,
            transcript: subTranscript,
            transcriptSizeBytes: subBuffer.byteLength,
          })
        }
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

      fs.rmSync(infiledDir, { recursive: true, force: true })

      console.log(opUrl)
    }),
  )
