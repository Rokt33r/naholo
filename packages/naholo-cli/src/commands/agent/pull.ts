import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { withErrorHandling } from '../../errors.js'
import { mergeObjectives } from '../../lib/merge-objectives.js'
import { formatObjectivesMarkdown } from '../../lib/objectives-markdown.js'
import { threeWayMerge } from '../../lib/three-way-merge.js'
import {
  getLocalOperationDir,
  getNotesDir,
  getBaseNotesDir,
  getObjectivesPath,
  getBaseObjectivesPath,
} from '../../lib/local-operations.js'

export const pullCommand = new Command('pull')
  .description('Pull operation context from server to local')
  .argument('<operationNumber>', 'Operation number')
  .action(
    withErrorHandling(async (operationNumber: string) => {
      const { client, projectSlug } = getCliContext()
      const opNum = Number(operationNumber)

      const [serverOperation, serverObjectives, serverNotes, serverLogs] =
        await Promise.all([
          client.getOperation(projectSlug, opNum),
          client.listObjectives(projectSlug, opNum),
          client.listNotes(projectSlug, opNum),
          client.listOperationLogs(projectSlug, opNum),
        ])

      const localDir = getLocalOperationDir(opNum)
      const isRerun = fs.existsSync(localDir)

      if (isRerun) {
        mergeAndReport(
          opNum,
          serverOperation,
          serverObjectives,
          serverNotes,
          serverLogs,
        )
      } else {
        freshPull(
          opNum,
          serverOperation,
          serverObjectives,
          serverNotes,
          serverLogs,
        )
      }
    }),
  )

interface OperationInfo {
  title: string
  number: number
}

function freshPull(
  operationNumber: number,
  serverOperation: OperationInfo,
  serverObjectives: {
    id: string
    parentObjectiveId: string | null
    name: string
    note: string | null
    done: boolean
    position: number
    createdAt: string
    updatedAt: string
  }[],
  serverNotes: { name: string; content: string }[],
  serverLogs: { id: string; content: string; createdAt: string }[],
): void {
  const notesDir = getNotesDir(operationNumber)
  const baseNotesDir = getBaseNotesDir(operationNumber)

  // Create directories
  fs.mkdirSync(notesDir, { recursive: true })
  fs.mkdirSync(baseNotesDir, { recursive: true })

  // Write OBJECTIVES.md
  const objectivesMd =
    serverObjectives.length > 0
      ? `# Objectives — Operation #${operationNumber}\n\n${formatObjectivesMarkdown(serverObjectives)}\n`
      : `# Objectives — Operation #${operationNumber}\n\n_(no objectives yet)_\n`

  fs.writeFileSync(getObjectivesPath(operationNumber), objectivesMd)
  fs.writeFileSync(getBaseObjectivesPath(operationNumber), objectivesMd)

  // Write notes
  for (const note of serverNotes) {
    const filename = `${note.name}.md`
    fs.writeFileSync(path.join(notesDir, filename), note.content)
    fs.writeFileSync(path.join(baseNotesDir, filename), note.content)
  }

  // Report
  const doneCount = serverObjectives.filter((o) => o.done).length
  console.log(
    `Pulled operation #${operationNumber}: "${serverOperation.title}"`,
  )
  console.log(
    `  Objectives: ${serverObjectives.length} (${doneCount} done, ${serverObjectives.length - doneCount} remaining)`,
  )
  console.log(
    `  Notes: ${serverNotes.length}${serverNotes.length > 0 ? ` (${serverNotes.map((n) => n.name).join(', ')})` : ''}`,
  )
  console.log(`  Logs: ${serverLogs.length} entries`)
  console.log(`  Local: ${getLocalOperationDir(operationNumber)}/`)
}

function mergeAndReport(
  operationNumber: number,
  serverOperation: OperationInfo,
  serverObjectives: {
    id: string
    parentObjectiveId: string | null
    name: string
    note: string | null
    done: boolean
    position: number
    createdAt: string
    updatedAt: string
  }[],
  serverNotes: { name: string; content: string }[],
  serverLogs: { id: string; content: string; createdAt: string }[],
): void {
  const notesDir = getNotesDir(operationNumber)
  const baseNotesDir = getBaseNotesDir(operationNumber)

  // Ensure dirs exist (they should, but just in case)
  fs.mkdirSync(notesDir, { recursive: true })
  fs.mkdirSync(baseNotesDir, { recursive: true })

  // --- Merge OBJECTIVES.md (structured, not text merge) ---
  const objectivesPath = getObjectivesPath(operationNumber)
  const localObjectivesMd = fs.existsSync(objectivesPath)
    ? fs.readFileSync(objectivesPath, 'utf-8')
    : ''
  const objMerge = mergeObjectives(
    operationNumber,
    localObjectivesMd,
    serverObjectives,
  )
  fs.writeFileSync(objectivesPath, objMerge.merged)

  // Also write server state to .base/ for future diffs
  const serverObjectivesMd =
    serverObjectives.length > 0
      ? `# Objectives — Operation #${operationNumber}\n\n${formatObjectivesMarkdown(serverObjectives)}\n`
      : `# Objectives — Operation #${operationNumber}\n\n_(no objectives yet)_\n`

  // --- Merge notes ---
  const noteResults: { name: string; action: string }[] = []

  // Track which server notes we've processed
  const processedServerNotes = new Set<string>()

  // Process server notes
  for (const serverNote of serverNotes) {
    processedServerNotes.add(serverNote.name)
    const localPath = path.join(notesDir, `${serverNote.name}.md`)
    const basePath = path.join(baseNotesDir, `${serverNote.name}.md`)

    const result = mergeFile(localPath, basePath, serverNote.content)
    noteResults.push({ name: serverNote.name, action: result })
  }

  // Check for locally-created notes (no server match, no base)
  const localNoteFiles = fs.existsSync(notesDir)
    ? fs.readdirSync(notesDir).filter((f) => f.endsWith('.md'))
    : []

  for (const file of localNoteFiles) {
    const name = file.replace(/\.md$/, '')
    if (!processedServerNotes.has(name)) {
      noteResults.push({ name, action: 'kept-local' })
    }
  }

  // Update .base/ with server state
  fs.writeFileSync(getBaseObjectivesPath(operationNumber), serverObjectivesMd)
  for (const serverNote of serverNotes) {
    fs.writeFileSync(
      path.join(baseNotesDir, `${serverNote.name}.md`),
      serverNote.content,
    )
  }

  // Report
  console.log(
    `Pulled operation #${operationNumber}: "${serverOperation.title}" (re-run)`,
  )
  console.log(
    `  Objectives: ${serverObjectives.length} on server — ${objMerge.updated} updated, ${objMerge.inserted} inserted`,
  )

  const counts = noteResults.reduce(
    (acc, r) => {
      acc[r.action] = (acc[r.action] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const countStr = Object.entries(counts)
    .map(([action, count]) => `${count} ${action}`)
    .join(', ')
  console.log(`  Notes: ${noteResults.length} total — ${countStr}`)
  if ((counts['conflict'] ?? 0) > 0) {
    const conflictNames = noteResults
      .filter((r) => r.action === 'conflict')
      .map((c) => c.name)
      .join(', ')
    console.log(`  Conflicts: ${conflictNames}`)
  }
  console.log(`  Logs: ${serverLogs.length} entries`)
  console.log(`  Local: ${getLocalOperationDir(operationNumber)}/`)
}

/**
 * Three-way merge for a single file.
 * - base == local && server differs → take server ("updated")
 * - base == server && local differs → keep local ("kept-local")
 * - both differ �� line-level 3-way merge, "merged" or "conflict"
 * - no local file → write server content ("created")
 * - all same → no-op ("unchanged")
 *
 * When base is missing, local is used as base (base == local → server wins).
 */
function mergeFile(
  localPath: string,
  basePath: string,
  serverContent: string,
): string {
  const localExists = fs.existsSync(localPath)

  if (!localExists) {
    fs.writeFileSync(localPath, serverContent)
    return 'created'
  }

  const localContent = fs.readFileSync(localPath, 'utf-8')

  // When base is missing, use local as base (base == local → server wins)
  const baseContent = fs.existsSync(basePath)
    ? fs.readFileSync(basePath, 'utf-8')
    : localContent

  if (baseContent === localContent && baseContent === serverContent) {
    return 'unchanged'
  }

  if (baseContent === localContent && baseContent !== serverContent) {
    // Only server changed — take server
    fs.writeFileSync(localPath, serverContent)
    return 'updated'
  }

  if (baseContent === serverContent && baseContent !== localContent) {
    // Only local changed — keep local
    return 'kept-local'
  }

  // Both changed — 3-way merge
  const result = threeWayMerge(baseContent, localContent, serverContent)
  fs.writeFileSync(localPath, result.merged)
  return result.hasConflict ? 'conflict' : 'merged'
}
