import fs from 'node:fs'
import { Command } from 'commander'
import { redactTranscript } from 'naholo-agent-transcripts/claude-code'
import { getCliContext } from '../../context.js'
import {
  NoInfilledOpCliError,
  NoProjectStateCliError,
  withErrorHandling,
} from '../../errors.js'
import { getProjectState } from '../../lib/project-state.js'
import { pushOp } from '../../lib/push-op.js'

export const exfilCommand = new Command('exfil')
  .description(
    'Push, drain registered transcripts, post a one-sentence log, optionally close, and remove the infilled dir',
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
        throw new NoInfilledOpCliError()
      }
      const opNum = opYml.number
      const close = options.close === true
      const infilledDir = projectState.getInfilledDir()
      const projectSlug = projectState.config.projectSlug
      const { client, currentProfile } = cliContext
      const baseUrl = currentProfile.profile.baseUrl.replace(/\/$/, '')
      const opUrl = `${baseUrl}/app/projects/${projectSlug}/operations/${opNum}`

      await pushOp(cliContext, projectState)

      const mode = projectState.config.uploadTranscriptsOnExfil ?? 'none'
      const transcripts = projectState.readLocalAgentTranscripts()

      for (const entry of transcripts) {
        if (mode === 'none') {
          continue
        }
        const raw = fs.readFileSync(entry.transcript_path, 'utf-8')
        const transcript = mode === 'redacted' ? redactTranscript(raw) : raw
        await client.recordAgentTranscript(
          projectSlug,
          opNum,
          entry.transcript_id,
          {
            title: entry.title,
            startedAt: entry.started_at,
            endedAt: entry.last_message_at,
            transcript,
          },
        )

        for (const subagent of entry.subagents) {
          const subRaw = fs.readFileSync(subagent.transcript_path, 'utf-8')
          const subTranscript =
            mode === 'redacted' ? redactTranscript(subRaw) : subRaw
          const syntheticId = `${entry.transcript_id}-subagent-${subagent.agentId}`
          await client.recordAgentTranscript(projectSlug, opNum, syntheticId, {
            title: null,
            startedAt: subagent.started_at,
            endedAt: subagent.last_message_at,
            transcript: subTranscript,
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

      fs.rmSync(infilledDir, { recursive: true, force: true })

      console.log(opUrl)
    }),
  )
