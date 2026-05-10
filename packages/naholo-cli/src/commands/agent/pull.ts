import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { stringify as yamlStringify } from 'yaml'
import { getCliContext } from '../../context.js'
import { CliError, withErrorHandling } from '../../errors.js'
import { mergeObjectives } from '../../lib/merge-objectives.js'
import { formatObjectivesMarkdown } from '../../lib/objectives-markdown.js'
import { threeWayMerge } from '../../lib/three-way-merge.js'
import {
  getLocalOperationDir,
  getNotesDir,
  getBaseNotesDir,
  getObjectivesPath,
  getBaseObjectivesPath,
  readOpYml,
  writeOpYml,
} from '../../lib/local-operations.js'

type ServerLog = {
  id: string
  content: string
  createdAt: string
  projectOperator: { id: string; name: string; type: string } | null
}

function writeLogsYaml(serverLogs: ServerLog[]): void {
  // Server is source of truth — overwrite local LOGS.yml on every pull.
  const entries = serverLogs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    author: log.projectOperator?.name ?? null,
    content: log.content,
  }))
  const logsPath = path.join(getLocalOperationDir(), 'LOGS.yml')
  fs.writeFileSync(logsPath, yamlStringify(entries))
}

export const pullCommand = new Command('pull')
  .description('Refresh the currently infiled operation from the server')
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
      const [serverOperation, serverObjectives, serverNotes, serverLogs] =
        await Promise.all([
          client.getOperation(projectSlug, opNum),
          client.listObjectives(projectSlug, opNum),
          client.listNotes(projectSlug, opNum),
          client.listOperationLogs(projectSlug, opNum),
        ])

      const notesDir = getNotesDir()
      const baseNotesDir = getBaseNotesDir()

      // Ensure dirs exist (they should, but just in case)
      fs.mkdirSync(notesDir, { recursive: true })
      fs.mkdirSync(baseNotesDir, { recursive: true })

      // --- Merge OBJECTIVES.md (structured, not text merge) ---
      const objectivesPath = getObjectivesPath()
      const localObjectivesMd = fs.existsSync(objectivesPath)
        ? fs.readFileSync(objectivesPath, 'utf-8')
        : ''
      const objMerge = mergeObjectives(
        opNum,
        localObjectivesMd,
        serverObjectives,
      )
      fs.writeFileSync(objectivesPath, objMerge.merged)

      // Server state for .base/ baseline
      const serverObjectivesMd =
        serverObjectives.length > 0
          ? `# OBJECTIVES — OP #${opNum}\n\n${formatObjectivesMarkdown(serverObjectives)}\n`
          : `# OBJECTIVES — OP #${opNum}\n\n_(no objectives yet)_\n`

      // --- Merge notes ---
      const noteResults: { name: string; action: string }[] = []
      const processedServerNotes = new Set<string>()

      for (const serverNote of serverNotes) {
        processedServerNotes.add(serverNote.name)
        const localPath = path.join(notesDir, `${serverNote.name}.md`)
        const basePath = path.join(baseNotesDir, `${serverNote.name}.md`)
        const result = mergeFile(localPath, basePath, serverNote.content)
        noteResults.push({ name: serverNote.name, action: result })
      }

      // Locally-created notes (no server match)
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
      fs.writeFileSync(getBaseObjectivesPath(), serverObjectivesMd)
      for (const serverNote of serverNotes) {
        fs.writeFileSync(
          path.join(baseNotesDir, `${serverNote.name}.md`),
          serverNote.content,
        )
      }

      writeLogsYaml(serverLogs)

      // Refresh op.yml title from server (preserve number).
      writeOpYml({ number: opNum, title: serverOperation.title })

      // Report
      console.log(
        `Pulled operation #${opNum}: "${serverOperation.title}" (re-run)`,
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
      console.log(`  Local: ${getLocalOperationDir()}/`)
    }),
  )

/**
 * Three-way merge for a single file.
 * - base == local && server differs → take server ("updated")
 * - base == server && local differs → keep local ("kept-local")
 * - both differ → line-level 3-way merge, "merged" or "conflict"
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
