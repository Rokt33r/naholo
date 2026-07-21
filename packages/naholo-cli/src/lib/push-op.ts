import fs from 'node:fs'
import path from 'node:path'
import type { CliContext } from '../context'
import { NoInfilledOpCliError } from '../errors'
import type { ProjectState } from './project-state'
import { parseTasksMarkdown } from './tasks-markdown'

export interface PushResult {
  opNum: number
  tasksSynced: number
  createdTasks: Array<{ id: string; name: string }>
  updatedNotes: string[]
  createdNotes: string[]
  localDir: string
}

export async function pushOp(
  cliContext: CliContext,
  projectState: ProjectState,
): Promise<PushResult> {
  const opYml = projectState.readOpYml()
  if (opYml == null) {
    throw new NoInfilledOpCliError()
  }
  const opNum = opYml.number
  const { client } = cliContext
  const projectSlug = projectState.config.projectSlug
  const localDir = projectState.getInfilledDir()

  // --- Sync tasks ---
  const tasksPath = projectState.getTasksPath()
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
  const notesDir = projectState.getNotesDir()
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
  const baseObjectivesPath = projectState.getBaseTasksPath()
  const baseNotesDir = projectState.getBaseNotesDir()
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
