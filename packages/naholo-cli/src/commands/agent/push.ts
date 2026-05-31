import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { CliError, withErrorHandling } from '../../errors.js'
import { parseTasksMarkdown } from '../../lib/tasks-markdown.js'
import {
  getLocalOperationDir,
  getNotesDir,
  getBaseNotesDir,
  getTasksPath,
  getBaseTasksPath,
  readOpYml,
} from '../../lib/local-operations.js'

export const pushCommand = new Command('push')
  .description('Push the infiled operation to the server')
  .action(
    withErrorHandling(async () => {
      const result = await runPush()
      console.log(`Pushed operation #${result.opNum}`)
      console.log(
        `  Tasks: ${result.tasksSynced} synced, ${result.createdTasks.length} created`,
      )
      if (result.createdTasks.length > 0) {
        for (const c of result.createdTasks) {
          console.log(`    + ${c.name} (${c.id})`)
        }
      }
      console.log(
        `  Notes: ${result.updatedNotes.length} updated, ${result.createdNotes.length} created`,
      )
      if (result.updatedNotes.length > 0) {
        console.log(`    Updated: ${result.updatedNotes.join(', ')}`)
      }
      if (result.createdNotes.length > 0) {
        console.log(`    Created: ${result.createdNotes.join(', ')}`)
      }
      console.log(`  Local: ${result.localDir}/`)
    }),
  )

export interface PushResult {
  opNum: number
  tasksSynced: number
  createdTasks: Array<{ id: string; name: string }>
  updatedNotes: string[]
  createdNotes: string[]
  localDir: string
}

export async function runPush(): Promise<PushResult> {
  const opYml = readOpYml()
  if (opYml == null) {
    throw new CliError(
      'No infiled operation. Run "naholo agent infil <n>" first.',
    )
  }
  const opNum = opYml.number
  const { client, projectSlug } = getCliContext()
  const localDir = getLocalOperationDir()

  // --- Sync tasks ---
  const tasksPath = getTasksPath()
  const tasksMd = fs.readFileSync(tasksPath, 'utf-8')
  const tasks = parseTasksMarkdown(tasksMd)

  const syncResult = await client.syncTasks(projectSlug, opNum, {
    tasks,
    taskIdsToDelete: [],
  })

  // Patch [ref] links for newly created tasks
  if (syncResult.created.length > 0) {
    let updatedMd = tasksMd
    for (const created of syncResult.created) {
      const escapedName = created.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const lineRe = new RegExp(`^(\\s*- \\[[ x]\\] ${escapedName})$`, 'm')
      updatedMd = updatedMd.replace(
        lineRe,
        `$1 [ref](naholo://tasks/${created.id})`,
      )
    }
    fs.writeFileSync(tasksPath, updatedMd)
  }

  // --- Sync notes ---
  const notesDir = getNotesDir()
  const serverNotes = await client.listNotes(projectSlug, opNum)
  const serverNoteMap = new Map(serverNotes.map((n) => [n.name, n]))

  const localNoteFiles = fs.existsSync(notesDir)
    ? fs.readdirSync(notesDir).filter((f) => f.endsWith('.md'))
    : []

  const updatedNotes: string[] = []
  const createdNotes: string[] = []

  for (const file of localNoteFiles) {
    const name = file.replace(/\.md$/, '')
    const content = fs.readFileSync(path.join(notesDir, file), 'utf-8')
    const serverNote = serverNoteMap.get(name)

    if (serverNote != null) {
      if (serverNote.content !== content) {
        await client.updateNote(projectSlug, opNum, name, { content })
        updatedNotes.push(name)
      }
    } else {
      await client.createNote(projectSlug, opNum, { name, content })
      createdNotes.push(name)
    }
  }

  // --- Update .base/ ---
  const baseObjectivesPath = getBaseTasksPath()
  const baseNotesDir = getBaseNotesDir()
  fs.mkdirSync(baseNotesDir, { recursive: true })

  const currentObjectivesMd = fs.readFileSync(tasksPath, 'utf-8')
  fs.writeFileSync(baseObjectivesPath, currentObjectivesMd)

  for (const file of localNoteFiles) {
    const content = fs.readFileSync(path.join(notesDir, file), 'utf-8')
    fs.writeFileSync(path.join(baseNotesDir, file), content)
  }

  return {
    opNum,
    tasksSynced: tasks.length,
    createdTasks: syncResult.created,
    updatedNotes,
    createdNotes,
    localDir,
  }
}
