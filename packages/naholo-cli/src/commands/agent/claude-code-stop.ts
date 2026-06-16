import fs from 'node:fs'
import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import {
  type LocalSubagentTranscriptEntry,
  listSubagentTranscriptFiles,
  resolveTranscriptMeta,
} from '../../lib/agent-transcripts.js'
import { getProjectState, type ProjectState } from '../../lib/project-state.js'

interface HookPayload {
  session_id?: unknown
  transcript_path?: unknown
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

      const projectState = getProjectState()
      if (projectState == null) {
        return
      }

      const opYml = projectState.readOpYml()
      if (opYml == null) {
        return
      }

      try {
        await registerAgentSessionTranscript(
          projectState,
          hook.session_id,
          hook.transcript_path,
        )
      } catch (error) {
        projectState.appendHookError('claude-code-stop', String(error))
      }
    }),
  )

async function registerAgentSessionTranscript(
  projectState: ProjectState,
  sessionId: string,
  transcriptPath: string,
): Promise<void> {
  const previous = projectState
    .readLocalAgentTranscripts()
    .find((e) => e.transcript_id === sessionId)

  const { firstTimestamp, lastTimestamp, title } = await resolveTranscriptMeta(
    transcriptPath,
    { aiTitle: true },
  )
  if (firstTimestamp == null || lastTimestamp == null) {
    throw new Error(
      `Transcript ${transcriptPath} has no timestamped JSONL entries`,
    )
  }

  const agentIdPreviousSubagentTranscriptMap = new Map<
    string,
    LocalSubagentTranscriptEntry
  >(
    previous?.subagents.map((subagentTranscript) => [
      subagentTranscript.agentId,
      subagentTranscript,
    ]) ?? [],
  )
  const subagents: LocalSubagentTranscriptEntry[] = []
  for (const {
    agentId,
    transcript_path: subagentTranscriptPath,
  } of listSubagentTranscriptFiles(transcriptPath)) {
    const subagentTranscriptSize = fs.statSync(subagentTranscriptPath).size
    const prevSubagentTranscriptMeta =
      agentIdPreviousSubagentTranscriptMap.get(agentId)
    if (
      prevSubagentTranscriptMeta != null &&
      prevSubagentTranscriptMeta.size_bytes === subagentTranscriptSize
    ) {
      subagents.push({
        ...prevSubagentTranscriptMeta,
        transcript_path: subagentTranscriptPath,
        size_bytes: subagentTranscriptSize,
      })
      continue
    }
    const { firstTimestamp, lastTimestamp } = await resolveTranscriptMeta(
      subagentTranscriptPath,
    )
    if (firstTimestamp == null || lastTimestamp == null) {
      continue
    }
    subagents.push({
      agentId,
      transcript_path: subagentTranscriptPath,
      started_at: firstTimestamp,
      last_message_at: lastTimestamp,
      size_bytes: subagentTranscriptSize,
    })
  }

  projectState.upsertLocalAgentTranscript({
    transcript_id: sessionId,
    transcript_path: transcriptPath,
    title,
    started_at: firstTimestamp,
    last_message_at: lastTimestamp,
    subagents,
  })
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
