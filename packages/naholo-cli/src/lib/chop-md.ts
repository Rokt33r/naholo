import { extractHeadingBody } from './markdown-utils.js'

export type ChopOpSide = {
  title: string
  situation: string
  mission: {
    coo: string
    woBlock: string
    trpBlock: string
  }
  taskLines: Array<{ done: boolean; title: string }>
}

export type ParsedChopMd = {
  intent: string
  currentOp: ChopOpSide & { number: number }
  newOp: ChopOpSide
}

export function parseChopMd(md: string): ParsedChopMd {
  const blocks = splitByHorizontalRule(md)
  if (blocks.length < 3) {
    throw new Error(
      'CHOP.md is malformed: expected three `---`-separated blocks (intent, CURRENT OP, NEW OP).',
    )
  }
  const [intentBlock, currentBlock, newBlock] = blocks

  const intent = extractHeadingBody(intentBlock, '## Intent')

  const currentHeading = currentBlock.match(
    /^# CURRENT OP #(\d+):\s*(.+?)\s*$/m,
  )
  if (currentHeading == null) {
    throw new Error(
      'CHOP.md `# CURRENT OP #N: Title` heading is missing or malformed.',
    )
  }
  const currentOp = {
    number: Number(currentHeading[1]),
    title: currentHeading[2],
    ...parseOpSideBody(currentBlock),
  }

  const newHeading = newBlock.match(/^# NEW OP:\s*(.+?)\s*$/m)
  if (newHeading == null) {
    throw new Error(
      'CHOP.md `# NEW OP: Title` heading is missing or malformed.',
    )
  }
  const newOp: ChopOpSide = {
    title: newHeading[1],
    ...parseOpSideBody(newBlock),
  }

  return { intent, currentOp, newOp }
}

export function composeNewOpOperationMd(input: {
  chop: ParsedChopMd
  parentExecutionByTitle: Map<string, string>
  parentNumber: number
  parentTitle: string
  newNumber: number
  carveDate: string
}): string {
  const { chop, parentExecutionByTitle, parentNumber, parentTitle, newNumber } =
    input

  const situation = appendCarvedNotesBullet(
    chop.newOp.situation,
    parentNumber,
    parentTitle,
    input.carveDate,
  )

  const parts: string[] = []
  parts.push(`# OP #${newNumber}: ${chop.newOp.title}`)
  parts.push('')
  parts.push('## SITUATION')
  parts.push('')
  parts.push(situation.trim())
  parts.push('')
  parts.push('## MISSION')
  parts.push('')
  parts.push('### Concept of Operations')
  parts.push('')
  parts.push(chop.newOp.mission.coo.trim())
  parts.push('')
  parts.push('### Warning Orders')
  parts.push('')
  parts.push(chop.newOp.mission.woBlock.trim())
  const trp = chop.newOp.mission.trpBlock.trim()
  if (trp.length > 0) {
    parts.push('')
    parts.push('### Target Reference Points')
    parts.push('')
    parts.push(trp)
  }
  if (chop.newOp.taskLines.length > 0) {
    parts.push('')
    parts.push('## EXECUTION')
    parts.push('')
    chop.newOp.taskLines.forEach((task, index) => {
      const newTaskNumber = index + 1
      const parentSection = parentExecutionByTitle.get(task.title)
      if (parentSection == null) {
        throw new Error(
          `New OP TASK ${newTaskNumber} title "${task.title}" has no matching task section on the parent.`,
        )
      }
      const renumbered = parentSection.replace(
        /^### TASK \d+ — .+$/m,
        `### TASK ${newTaskNumber} — ${task.title}`,
      )
      parts.push(renumbered.trim())
      parts.push('')
    })
  }
  return (
    parts
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  )
}

function parseOpSideBody(block: string): Omit<ChopOpSide, 'title'> {
  const situation = extractHeadingBody(block, '## SITUATION')
  const missionBody = extractHeadingBody(block, '## MISSION')
  const executionBody = extractHeadingBody(block, '## EXECUTION')

  return {
    situation,
    mission: {
      coo: extractHeadingBody(missionBody, '### Concept of Operations'),
      woBlock: extractHeadingBody(missionBody, '### Warning Orders'),
      trpBlock: extractHeadingBody(missionBody, '### Target Reference Points'),
    },
    taskLines: parseTaskCheckboxes(executionBody),
  }
}

function splitByHorizontalRule(md: string): string[] {
  return md
    .split(/^---\s*$/m)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
}

function parseTaskCheckboxes(
  body: string,
): Array<{ done: boolean; title: string }> {
  const out: Array<{ done: boolean; title: string }> = []
  for (const line of body.split('\n')) {
    const match = line.match(/^- \[( |x)\] TASK \d+ — (.+?)\s*$/)
    if (match != null) {
      out.push({ done: match[1] === 'x', title: match[2] })
    }
  }
  return out
}

function appendCarvedNotesBullet(
  situation: string,
  parentNumber: number,
  parentTitle: string,
  carveDate: string,
): string {
  const bullet = `- Carved from OP #${parentNumber} (${parentTitle}) on ${carveDate}. See parent's TIMELINE for the chop event.`
  const hasNotesHeading = /^### Notes\s*$/m.test(situation)
  if (hasNotesHeading) {
    return `${situation.replace(/\n+$/, '')}\n${bullet}`
  }
  return `${situation.replace(/\n+$/, '')}\n\n### Notes\n\n${bullet}`
}
