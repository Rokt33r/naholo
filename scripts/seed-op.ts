import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db'
import { projects, projectOperators } from '../src/server/db/schema'
import { createOperation } from '../src/server/services/operation'
import { upsertAgentTranscript } from '../src/server/services/agent-transcript'
import { createTask } from '../src/server/services/task'
import { setTaskDone } from '../src/server/services/task'
import { createNote } from '../src/server/services/note'
import { createOperationLog } from '../src/server/services/operation-log'
import { getFileStorageAdapter } from '../src/server/file-storage'

type SourceAgentTranscript = {
  id: string
  transcriptId: string
  title: string | null
  startedAt: string
  endedAt: string
  hasTranscript: boolean
  transcriptSizeBytes: number
}

type SourceTask = {
  id: string
  parentTaskId: string | null
  name: string
  note: string | null
  done: boolean
  position: number
}

type SourceNote = {
  id: string
  name: string
  content: string
  position: number
}

type SourceOperationLog = {
  id: string
  content: string
}

type OperationDump = {
  number: number
  title: string
  projectSlug: string
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('seed-op refuses to run with NODE_ENV=production.')
    process.exit(1)
  }

  const [source, destProjSlug] = process.argv.slice(2)
  if (source == null || destProjSlug == null) {
    console.error(
      'Usage: pnpm tsx scripts/seed-op.ts <projSlug>/<n> <destProjSlug>',
    )
    process.exit(1)
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'naholo-seed-'))

  try {
    const dump = spawnSync('naholo', ['dev', 'dump-op', source, tmpDir], {
      stdio: 'inherit',
    })
    if (dump.status !== 0) {
      console.error(`\`naholo dev dump-op\` exited with status ${dump.status}.`)
      process.exit(dump.status ?? 1)
    }

    const operation = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'operation.json'), 'utf-8'),
    ) as OperationDump
    const tasks = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'tasks.json'), 'utf-8'),
    ) as SourceTask[]
    const notes = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'notes.json'), 'utf-8'),
    ) as SourceNote[]
    const logs = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'logs.json'), 'utf-8'),
    ) as SourceOperationLog[]
    const transcripts = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'sessions.json'), 'utf-8'),
    ) as SourceAgentTranscript[]

    const destProject = await db.query.projects.findFirst({
      where: eq(projects.slug, destProjSlug),
    })
    if (destProject == null) {
      console.error(`Destination project "${destProjSlug}" not found.`)
      process.exit(1)
    }

    const destOperator = await db.query.projectOperators.findFirst({
      where: eq(projectOperators.projectId, destProject.id),
    })
    if (destOperator == null) {
      console.error(
        `Destination project "${destProjSlug}" has no project operators — cannot create the seeded operation.`,
      )
      process.exit(1)
    }

    const created = await createOperation({
      projectId: destProject.id,
      projectOperatorId: destOperator.id,
      title: `[seed ${operation.projectSlug}#${operation.number}] ${operation.title}`,
    })
    if (!created.success) {
      console.error(`Failed to create operation: ${created.error.message}`)
      process.exit(1)
    }
    const destOperationId = created.data.id
    const destOperationNumber = created.data.number

    const sortedTasks = [...tasks].sort((a, b) => a.position - b.position)
    const taskIdMap = new Map<string, string>()
    let tasksCreated = 0
    const remaining = new Set(sortedTasks.map((o) => o.id))
    let progress = true
    while (remaining.size > 0 && progress) {
      progress = false
      for (const obj of sortedTasks) {
        if (!remaining.has(obj.id)) {
          continue
        }
        if (obj.parentTaskId != null && !taskIdMap.has(obj.parentTaskId)) {
          continue
        }
        const parentId =
          obj.parentTaskId == null
            ? null
            : (taskIdMap.get(obj.parentTaskId) ?? null)
        const created = await createTask({
          projectId: destProject.id,
          operationId: destOperationId,
          projectOperatorId: destOperator.id,
          name: obj.name,
          note: obj.note,
          parentTaskId: parentId,
          position: obj.position,
        })
        if (!created.success) {
          console.error(
            `Failed to create task "${obj.name}": ${created.error.message}`,
          )
          remaining.delete(obj.id)
          continue
        }
        taskIdMap.set(obj.id, created.data.id)
        if (obj.done) {
          const flagged = await setTaskDone({
            projectId: destProject.id,
            operationId: destOperationId,
            projectOperatorId: destOperator.id,
            taskId: created.data.id,
            done: true,
          })
          if (!flagged.success) {
            console.error(
              `Failed to flag task "${obj.name}" done: ${flagged.error.message}`,
            )
          }
        }
        tasksCreated += 1
        remaining.delete(obj.id)
        progress = true
      }
    }
    if (remaining.size > 0) {
      console.warn(
        `  ! ${remaining.size} task(s) skipped — parent task missing or failed`,
      )
    }

    let notesCreated = 0
    for (const note of [...notes].sort((a, b) => a.position - b.position)) {
      const created = await createNote({
        projectId: destProject.id,
        operationId: destOperationId,
        projectOperatorId: destOperator.id,
        name: note.name,
        content: note.content,
      })
      if (!created.success) {
        console.error(
          `Failed to create note "${note.name}": ${created.error.message}`,
        )
        continue
      }
      notesCreated += 1
    }

    let logsCreated = 0
    for (const log of logs) {
      const created = await createOperationLog({
        projectId: destProject.id,
        operationId: destOperationId,
        projectOperatorId: destOperator.id,
        content: log.content,
      })
      if (!created.success) {
        console.error(`Failed to create log: ${created.error.message}`)
        continue
      }
      logsCreated += 1
    }

    const fileStorage = getFileStorageAdapter()
    let transcriptsCreated = 0
    let transcriptsCopied = 0

    for (const transcript of transcripts) {
      let transcriptText: string | null = null
      if (transcript.hasTranscript) {
        const transcriptPath = path.join(
          tmpDir,
          'transcripts',
          `${transcript.transcriptId}.jsonl`,
        )
        if (!fs.existsSync(transcriptPath)) {
          console.warn(
            `  ! transcript file missing for ${transcript.transcriptId} — skipping`,
          )
          continue
        }
        transcriptText = fs.readFileSync(transcriptPath, 'utf-8')
        await fileStorage.putObject(
          `agent-transcripts/${destProject.id}/${destOperationId}/${transcript.transcriptId}`,
          transcriptText,
        )
        transcriptsCopied += 1
      }

      const upserted = await upsertAgentTranscript({
        projectId: destProject.id,
        operationId: destOperationId,
        projectOperatorId: destOperator.id,
        transcriptId: transcript.transcriptId,
        title: transcript.title,
        startedAt: new Date(transcript.startedAt),
        endedAt: new Date(transcript.endedAt),
        transcriptSizeBytes: transcript.transcriptSizeBytes,
        transcriptText,
      })
      if (!upserted.success) {
        console.error(
          `Failed to upsert transcript ${transcript.transcriptId}: ${upserted.error.message}`,
        )
        continue
      }
      transcriptsCreated += 1
    }

    console.log(
      `Seeded ${operation.projectSlug}#${operation.number} → ${destProjSlug}#${destOperationNumber}`,
    )
    console.log(
      `  ${tasksCreated}/${tasks.length} task(s), ${notesCreated}/${notes.length} note(s), ${logsCreated}/${logs.length} log(s), ${transcriptsCreated}/${transcripts.length} transcript(s), ${transcriptsCopied} body(ies)`,
    )
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
