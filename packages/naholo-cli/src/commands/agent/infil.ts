import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { stringify as yamlStringify } from 'yaml'
import { getCliContext } from '../../context'
import {
  CliError,
  NoProjectStateCliError,
  withErrorHandling,
} from '../../errors'
import { getProjectState } from '../../lib/project-state'
import { formatTasksMarkdown } from '../../lib/tasks-markdown'

export const infilCommand = new Command('infil')
  .description('Initial fetch of an operation from server to local')
  .argument('<operationNumber>', 'Operation number')
  .action(
    withErrorHandling(async (operationNumber: string) => {
      const opNum = parseInt(operationNumber, 10)
      if (
        !Number.isInteger(opNum) ||
        opNum <= 0 ||
        String(opNum) !== operationNumber.trim()
      ) {
        throw new CliError(
          `Invalid operation number: "${operationNumber}". Must be a positive integer.`,
        )
      }

      const cliContext = getCliContext()
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }

      const infilledDir = projectState.getInfilledDir()
      if (fs.existsSync(infilledDir)) {
        throw new CliError('Already infilled. Run "naholo agent exfil" first.')
      }

      const projectSlug = projectState.config.projectSlug
      const { client } = cliContext

      const [serverOperation, serverTasks, serverNotes, serverLogs] =
        await Promise.all([
          client.getOperation(projectSlug, opNum),
          client.listTasks(projectSlug, opNum),
          client.listNotes(projectSlug, opNum),
          client.listOperationLogs(projectSlug, opNum),
        ])

      const notesDir = projectState.getNotesDir()
      const baseNotesDir = projectState.getBaseNotesDir()

      fs.mkdirSync(notesDir, { recursive: true })
      fs.mkdirSync(baseNotesDir, { recursive: true })

      const tasksMd =
        serverTasks.length > 0
          ? `# TASKS — OP #${opNum}\n\n${formatTasksMarkdown(serverTasks)}\n`
          : `# TASKS — OP #${opNum}\n\n_(no tasks yet)_\n`

      fs.writeFileSync(projectState.getTasksPath(), tasksMd)
      fs.writeFileSync(projectState.getBaseTasksPath(), tasksMd)

      for (const note of serverNotes) {
        const filename = `${note.name}.md`
        fs.writeFileSync(path.join(notesDir, filename), note.content)
        fs.writeFileSync(path.join(baseNotesDir, filename), note.content)
      }

      const logEntries = serverLogs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt,
        author: log.projectOperator?.name ?? null,
        content: log.content,
      }))
      fs.writeFileSync(
        path.join(infilledDir, 'LOGS.yml'),
        yamlStringify(logEntries),
      )

      projectState.writeOpYml({ number: opNum, title: serverOperation.title })

      // Claim the op for whoever ran infil.
      await client.createOperationAssignees(projectSlug, opNum, ['self'])

      await client.createOperationLog(projectSlug, opNum, {
        content: `Infil — OP #${opNum}.`,
      })

      const doneCount = serverTasks.filter((o) => o.done).length
      console.log(`Infilled operation #${opNum}`)
      console.log(`  Title: ${serverOperation.title}`)
      console.log(
        `  Tasks: ${serverTasks.length} (${doneCount} done, ${serverTasks.length - doneCount} remaining)`,
      )
      console.log(
        `  Notes: ${serverNotes.length}${serverNotes.length > 0 ? ` (${serverNotes.map((n) => n.name).join(', ')})` : ''}`,
      )
      console.log(`  Logs: ${serverLogs.length} entries`)
      console.log(`  Assigned yourself to this operation`)
      console.log(`  Local: ${infilledDir}/`)
    }),
  )
