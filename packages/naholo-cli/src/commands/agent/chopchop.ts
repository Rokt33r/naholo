import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import {
  CliError,
  NoInfilledOpCliError,
  NoProjectStateCliError,
  withErrorHandling,
} from '../../errors.js'
import { composeNewOpOperationMd, parseChopMd } from '../../lib/chop-md.js'
import { getProjectState, type ProjectState } from '../../lib/project-state.js'
import {
  composeParentOperationMd,
  parseConstraintLabels,
  parseOperationMd,
  pruneCarvedConstraintsFromBlock,
} from '../../lib/operation-md.js'
import { pushOp } from '../../lib/push-op.js'

export const chopchopCommand = new Command('chopchop')
  .description(
    'Apply the CHOP proposal in notes/CHOP.md: spawn the new OP, prune the parent, push, cleanup.',
  )
  .action(
    withErrorHandling(async () => {
      const cliContext = getCliContext()
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }
      const opYml = projectState.readOpYml()
      if (opYml == null) {
        throw new NoInfilledOpCliError()
      }
      const parentNumber = opYml.number
      const originalParentTitle = opYml.title
      const projectSlug = projectState.config.projectSlug
      const { client } = cliContext

      const notesDir = projectState.getNotesDir()
      const chopPath = path.join(notesDir, 'CHOP.md')
      const operationPath = path.join(notesDir, 'OPERATION.md')
      const tasksPath = projectState.getTasksPath()

      if (!fs.existsSync(chopPath)) {
        throw new CliError(
          'notes/CHOP.md not found. Run "/chop \\"freeform\\"" first.',
        )
      }
      if (!fs.existsSync(operationPath)) {
        throw new CliError('notes/OPERATION.md not found on the parent OP.')
      }
      if (!fs.existsSync(tasksPath)) {
        throw new CliError('TASKS.md not found on the parent OP.')
      }

      const chopMd = fs.readFileSync(chopPath, 'utf-8')
      const parentOperationMd = fs.readFileSync(operationPath, 'utf-8')
      const parentTasksMd = fs.readFileSync(tasksPath, 'utf-8')

      const chop = parseChopMd(chopMd)
      const parent = parseOperationMd(parentOperationMd)

      if (chop.currentOp.number !== parentNumber) {
        throw new CliError(
          `CHOP CURRENT OP number (#${chop.currentOp.number}) does not match the infilled OP (#${parentNumber}).`,
        )
      }

      const carvedConstraintLabels = new Set(
        parseConstraintLabels(chop.newOp.warningOrder.constraintsBlock),
      )
      const carvedTaskTitles = new Set(chop.newOp.taskLines.map((t) => t.title))

      const newOpResult = await client.createOperation(projectSlug, {
        title: chop.newOp.title,
      })
      const newNumber = newOpResult.number
      const newUrl = `${client.baseUrl}/app/projects/${projectSlug}/operations/${newNumber}`

      const carveDate = new Date().toISOString().slice(0, 10)
      const newOperationMd = composeNewOpOperationMd({
        chop,
        parentTaskMap: parent.taskMap,
        parentNumber,
        parentTitle: chop.currentOp.title,
        newNumber,
        carveDate,
      })

      await client.createNote(projectSlug, newNumber, {
        name: 'OPERATION',
        content: newOperationMd,
      })

      for (let i = 0; i < chop.newOp.taskLines.length; i += 1) {
        const task = chop.newOp.taskLines[i]
        const created = await client.createTask(projectSlug, newNumber, {
          name: task.title,
          position: i + 1,
        })
        if (task.done) {
          await client.updateTask(projectSlug, newNumber, created.id, {
            done: true,
          })
        }
      }

      const seedLog = `Carved from OP #${parentNumber}: "${chop.currentOp.title}". Prior context lives in that OP's TIMELINE and earlier logs.`
      await client.createOperationLog(projectSlug, newNumber, {
        content: seedLog,
      })

      const prunedParent = {
        ...parent,
        title: chop.currentOp.title,
        situation: chop.currentOp.situation,
        warningOrder: {
          conops: chop.currentOp.warningOrder.conops,
          constraintsBlock: pruneCarvedConstraintsFromBlock(
            parent.warningOrder.constraintsBlock,
            carvedConstraintLabels,
          ),
          trpBlock: chop.currentOp.warningOrder.trpBlock,
        },
        taskMap: new Map(
          [...parent.taskMap.entries()].filter(
            ([title]) => !carvedTaskTitles.has(title),
          ),
        ),
      }
      const newParentOperationMd = composeParentOperationMd(prunedParent)
      fs.writeFileSync(operationPath, newParentOperationMd)

      const newParentTasksMd = pruneCarvedTasks(parentTasksMd, carvedTaskTitles)
      fs.writeFileSync(tasksPath, newParentTasksMd)

      let renamedFrom = ''
      let renamedTo = ''
      if (chop.currentOp.title !== originalParentTitle) {
        await client.updateOperation(projectSlug, parentNumber, {
          title: chop.currentOp.title,
        })
        projectState.writeOpYml({
          number: parentNumber,
          title: chop.currentOp.title,
        })
        renamedFrom = originalParentTitle
        renamedTo = chop.currentOp.title
      }

      await pushOp(cliContext, projectState)

      try {
        await client.deleteNote(projectSlug, parentNumber, 'CHOP')
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error
        }
      }
      fs.rmSync(chopPath)

      const renameClause =
        renamedFrom.length > 0
          ? `; renamed parent "${renamedFrom}" → "${renamedTo}"`
          : ''
      const timelineSummary = `Applied CHOP: spawned OP #${newNumber} "${chop.newOp.title}"; moved constraints: ${[...carvedConstraintLabels].join(', ') || 'none'}; moved tasks: ${chop.newOp.taskLines.length}${renameClause}.`
      appendTimelineBullet(projectState, 'chopchop', timelineSummary)

      const finalParentMd = fs.readFileSync(operationPath, 'utf-8')
      const finalTasksMd = fs.readFileSync(tasksPath, 'utf-8')
      const result = computeResultBlock({
        parentNumber,
        parentTitle: chop.currentOp.title,
        newNumber,
        newTitle: chop.newOp.title,
        newUrl,
        movedConstraints: carvedConstraintLabels.size,
        movedTasks: chop.newOp.taskLines.length,
        parentOperationMd: finalParentMd,
        parentTasksMd: finalTasksMd,
      })
      console.log(result)
    }),
  )

function pruneCarvedTasks(tasksMd: string, carvedTitles: Set<string>): string {
  const lines = tasksMd.split('\n')
  const kept = lines.filter((line) => {
    const match = line.match(
      /^- \[[ x]\] \d+\.\s+(.+?)(?:\s+\[ref\]\(.+\))?\s*$/,
    )
    if (match == null) {
      return true
    }
    return !carvedTitles.has(match[1])
  })
  return kept.join('\n')
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  return /\b404\b/.test(error.message) || /not found/i.test(error.message)
}

function appendTimelineBullet(
  projectState: ProjectState,
  type: string,
  contents: string,
): void {
  const notesDir = projectState.getNotesDir()
  const timelinePath = path.join(notesDir, 'TIMELINE.md')
  const opYml = projectState.readOpYml()
  if (!fs.existsSync(timelinePath) && opYml != null) {
    fs.mkdirSync(notesDir, { recursive: true })
    fs.writeFileSync(timelinePath, `# TIMELINE — OP #${opYml.number}\n\n`)
  }
  const timestamp = formatLocalTimestamp(new Date())
  const bullet = `- ${timestamp} — ${type}: ${contents}\n`
  fs.appendFileSync(timelinePath, bullet)
}

function formatLocalTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function computeResultBlock(input: {
  parentNumber: number
  parentTitle: string
  newNumber: number
  newTitle: string
  newUrl: string
  movedConstraints: number
  movedTasks: number
  parentOperationMd: string
  parentTasksMd: string
}): string {
  const lines = input.parentOperationMd.split('\n')
  const missionLine = findLineNumber(lines, '## MISSION')
  const executionLine = findLineNumber(lines, '## EXECUTION')

  const taskRows = parseTaskRows(input.parentTasksMd)
  const hasExecution = executionLine > 0 && taskRows.length > 0
  const firstUnchecked = taskRows.find((t) => !t.done)
  const allShipped = hasExecution && taskRows.every((t) => t.done)

  let parentOpState: 'mission-only' | 'execution-ready' | 'all-shipped'
  if (!hasExecution) {
    parentOpState = 'mission-only'
  } else if (allShipped) {
    parentOpState = 'all-shipped'
  } else {
    parentOpState = 'execution-ready'
  }

  const nextTaskLine =
    firstUnchecked != null
      ? findTaskHeadingLine(lines, firstUnchecked.number, firstUnchecked.title)
      : 0

  const fields: Array<[string, string]> = [
    ['parentNumber', String(input.parentNumber)],
    ['parentTitle', input.parentTitle],
    ['newNumber', String(input.newNumber)],
    ['newTitle', input.newTitle],
    ['newUrl', input.newUrl],
    ['movedConstraints', String(input.movedConstraints)],
    ['movedTasks', String(input.movedTasks)],
    ['missionLine', missionLine > 0 ? String(missionLine) : 'n/a'],
    ['parentOpState', parentOpState],
    ['executionLine', executionLine > 0 ? String(executionLine) : 'n/a'],
    ['nextTaskLine', nextTaskLine > 0 ? String(nextTaskLine) : 'n/a'],
    [
      'nextTaskNumber',
      firstUnchecked != null ? String(firstUnchecked.number) : 'n/a',
    ],
    ['nextTaskTitle', firstUnchecked != null ? firstUnchecked.title : 'n/a'],
  ]
  return fields.map(([k, v]) => `${k}: ${v}`).join('\n')
}

function findLineNumber(lines: string[], heading: string): number {
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === heading) {
      return i + 1
    }
  }
  return 0
}

function findTaskHeadingLine(
  lines: string[],
  taskNumber: number,
  title: string,
): number {
  const target = `### TASK ${taskNumber} — ${title}`
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === target) {
      return i + 1
    }
  }
  return 0
}

function parseTaskRows(
  tasksMd: string,
): Array<{ number: number; title: string; done: boolean }> {
  const rows: Array<{ number: number; title: string; done: boolean }> = []
  for (const line of tasksMd.split('\n')) {
    const match = line.match(
      /^- \[( |x)\] (\d+)\.\s+(.+?)(?:\s+\[ref\]\(.+\))?\s*$/,
    )
    if (match != null) {
      rows.push({
        done: match[1] === 'x',
        number: Number(match[2]),
        title: match[3],
      })
    }
  }
  return rows
}
