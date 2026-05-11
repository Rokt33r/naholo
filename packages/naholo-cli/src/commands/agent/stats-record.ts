import { spawn } from 'node:child_process'
import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { withErrorHandling } from '../../errors.js'
import { readOpYml } from '../../lib/local-operations.js'
import { extractTranscriptMeta, upsertSession } from '../../lib/sessions.js'

interface HookPayload {
  session_id?: unknown
  transcript_path?: unknown
}

interface UploadPayload {
  projectSlug: string
  operationNumber: number
  sessionId: string
  title: string | null
  startedAt: string
  endedAt: string
  transcript: string | null
  transcriptTruncated: boolean
  transcriptSizeBytes: number
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
    'Claude Code Stop hook handler: capture session JSONL and upload to Naholo',
  )
  .option(
    '--upload-only',
    'Internal: read an upload payload from stdin and POST to Naholo (detached child mode)',
  )
  .action(
    withErrorHandling(async (opts: { uploadOnly?: boolean }) => {
      if (opts.uploadOnly === true) {
        const payload = (await readStdinJson()) as UploadPayload | null
        if (payload == null) {
          return
        }
        const { client } = getCliContext()
        await client.recordAgentSession(
          payload.projectSlug,
          payload.operationNumber,
          {
            sessionId: payload.sessionId,
            title: payload.title,
            startedAt: payload.startedAt,
            endedAt: payload.endedAt,
            transcript: payload.transcript,
            transcriptTruncated: payload.transcriptTruncated,
            transcriptSizeBytes: payload.transcriptSizeBytes,
          },
        )
        return
      }

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

      const meta = await extractTranscriptMeta(transcriptPath)

      upsertSession({
        session_id: sessionId,
        transcript_path: transcriptPath,
        title: meta.title,
        started_at: meta.startedAt,
        ended_at: meta.endedAt,
      })

      const { projectSlug } = getCliContext()
      const uploadPayload: UploadPayload = {
        projectSlug,
        operationNumber: opYml.number,
        sessionId,
        title: meta.title,
        startedAt: meta.startedAt,
        endedAt: meta.endedAt,
        transcript: meta.transcript,
        transcriptTruncated: meta.truncated,
        transcriptSizeBytes: meta.sizeBytes,
      }

      const entryScript = process.argv[1]
      const child = spawn(
        process.execPath,
        [entryScript, 'agent', 'stats-record', '--upload-only'],
        {
          detached: true,
          stdio: ['pipe', 'ignore', 'ignore'],
        },
      )
      child.stdin?.write(JSON.stringify(uploadPayload))
      child.stdin?.end()
      child.unref()
    }),
  )
