import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { CliError, withErrorHandling } from '../../errors.js'
import { parseObjectivesMarkdown } from '../../lib/objectives-markdown.js'
import {
  getLocalOperationDir,
  getNotesDir,
  getBaseNotesDir,
  getObjectivesPath,
  getBaseObjectivesPath,
} from '../../lib/local-operations.js'

export const pushCommand = new Command('push')
  .description('Push local operation changes to server')
  .argument('<operationNumber>', 'Operation number')
  .action(
    withErrorHandling(async (operationNumber: string) => {
      const { client, projectSlug } = getCliContext()
      const opNum = Number(operationNumber)

      const localDir = getLocalOperationDir(opNum)
      if (!fs.existsSync(localDir)) {
        throw new CliError(
          `No local data for operation #${opNum}. Run "naholo agent pull ${opNum}" first.`,
        )
      }

      // --- Sync objectives ---
      const objectivesPath = getObjectivesPath(opNum)
      const objectivesMd = fs.readFileSync(objectivesPath, 'utf-8')
      const objectives = parseObjectivesMarkdown(objectivesMd)

      const syncResult = await client.syncObjectives(projectSlug, opNum, {
        objectives,
        objectiveIdsToDelete: [],
      })

      // Patch [ref] links for newly created objectives
      if (syncResult.created.length > 0) {
        let updatedMd = objectivesMd
        for (const created of syncResult.created) {
          // Find line matching the name without a [ref] link and add one
          const escapedName = created.name.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          )
          const lineRe = new RegExp(`^(\\s*- \\[[ x]\\] ${escapedName})$`, 'm')
          updatedMd = updatedMd.replace(
            lineRe,
            `$1 [ref](naholo://objectives/${created.id})`,
          )
        }
        fs.writeFileSync(objectivesPath, updatedMd)
      }

      // --- Sync notes ---
      const notesDir = getNotesDir(opNum)
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
      const baseObjectivesPath = getBaseObjectivesPath(opNum)
      const baseNotesDir = getBaseNotesDir(opNum)
      fs.mkdirSync(baseNotesDir, { recursive: true })

      // .base/ = current local state (what was just pushed)
      const currentObjectivesMd = fs.readFileSync(objectivesPath, 'utf-8')
      fs.writeFileSync(baseObjectivesPath, currentObjectivesMd)

      for (const file of localNoteFiles) {
        const content = fs.readFileSync(path.join(notesDir, file), 'utf-8')
        fs.writeFileSync(path.join(baseNotesDir, file), content)
      }

      // --- Report ---
      console.log(`Pushed operation #${opNum}`)
      console.log(
        `  Objectives: ${objectives.length} synced, ${syncResult.created.length} created`,
      )
      if (syncResult.created.length > 0) {
        for (const c of syncResult.created) {
          console.log(`    + ${c.name} (${c.id})`)
        }
      }
      console.log(
        `  Notes: ${updatedNotes.length} updated, ${createdNotes.length} created`,
      )
      if (updatedNotes.length > 0) {
        console.log(`    Updated: ${updatedNotes.join(', ')}`)
      }
      if (createdNotes.length > 0) {
        console.log(`    Created: ${createdNotes.join(', ')}`)
      }
      console.log(`  Local: ${localDir}/`)
    }),
  )
