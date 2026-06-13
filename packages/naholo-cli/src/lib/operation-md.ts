import { extractHeadingBody } from './markdown-utils.js'

export type ParsedOperationMd = {
  number: number
  title: string
  situation: string
  warningOrder: {
    conops: string
    constraintsBlock: string
    trpBlock: string
  }
  taskMap: Map<string, string>
}

export function parseOperationMd(md: string): ParsedOperationMd {
  const headingMatch = md.match(/^# OP #(\d+):\s*(.+?)\s*$/m)
  if (headingMatch == null) {
    throw new Error('OPERATION.md is missing the `# OP #N: Title` heading')
  }
  const number = Number(headingMatch[1])
  const title = headingMatch[2]

  const situation = extractHeadingBody(md, '## SITUATION')
  const warningOrderBody = extractHeadingBody(md, '## WARNING ORDER')
  const operationOrderBody = extractHeadingBody(md, '## OPERATION ORDER')

  const conops = extractHeadingBody(
    warningOrderBody,
    '### Concept of Operations',
  )
  const constraintsBlock = extractHeadingBody(
    warningOrderBody,
    '### Constraints',
  )
  const trpBlock = extractHeadingBody(
    warningOrderBody,
    '### Target Reference Points',
  )

  const taskMap = parseTaskSections(operationOrderBody)

  return {
    number,
    title,
    situation,
    warningOrder: { conops, constraintsBlock, trpBlock },
    taskMap,
  }
}

export function pruneCarvedConstraintsFromBlock(
  constraintsBlock: string,
  carvedLabels: Set<string>,
): string {
  const bullets = parseConstraintBullets(constraintsBlock)
  const kept = bullets.filter((b) => !carvedLabels.has(b.label))
  return joinConstraintBullets(kept)
}

export function composeParentOperationMd(parsed: ParsedOperationMd): string {
  const parts: string[] = []
  parts.push(`# OP #${parsed.number}: ${parsed.title}`)
  parts.push('')
  parts.push('## SITUATION')
  parts.push('')
  parts.push(parsed.situation.trim())
  parts.push('')
  parts.push('## WARNING ORDER')
  parts.push('')
  parts.push('### Concept of Operations')
  parts.push('')
  parts.push(parsed.warningOrder.conops.trim())
  parts.push('')
  parts.push('### Constraints')
  parts.push('')
  parts.push(parsed.warningOrder.constraintsBlock.trim())
  const trp = parsed.warningOrder.trpBlock.trim()
  if (trp.length > 0) {
    parts.push('')
    parts.push('### Target Reference Points')
    parts.push('')
    parts.push(trp)
  }
  if (parsed.taskMap.size > 0) {
    parts.push('')
    parts.push('## OPERATION ORDER')
    parts.push('')
    for (const section of parsed.taskMap.values()) {
      parts.push(section.trim())
      parts.push('')
    }
  }
  return (
    parts
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  )
}

export function parseConstraintLabels(constraintsBlock: string): string[] {
  return parseConstraintBullets(constraintsBlock).map((b) => b.label)
}

type ConstraintBullet = { label: string; body: string[] }

function parseConstraintBullets(constraintsBlock: string): ConstraintBullet[] {
  const bullets: ConstraintBullet[] = []
  let current: ConstraintBullet | null = null
  for (const line of constraintsBlock.split('\n')) {
    const labelMatch = line.match(/^- \*\*(.+?)\*\*/)
    if (labelMatch != null) {
      if (current != null) {
        bullets.push(current)
      }
      current = { label: labelMatch[1], body: [line] }
      continue
    }
    if (current != null && (line.startsWith(' ') || line.startsWith('\t'))) {
      current.body.push(line)
      continue
    }
    if (current != null && line.trim().length === 0) {
      // tolerate a single blank line inside the block; don't append it to the
      // current bullet — blank lines belong to the block as a whole.
      continue
    }
    // Anything else terminates the current bullet.
    if (current != null) {
      bullets.push(current)
      current = null
    }
  }
  if (current != null) {
    bullets.push(current)
  }
  return bullets
}

function joinConstraintBullets(bullets: ConstraintBullet[]): string {
  return bullets.map((b) => b.body.join('\n')).join('\n')
}

function parseTaskSections(operationOrderBody: string): Map<string, string> {
  const map = new Map<string, string>()
  if (operationOrderBody.trim().length === 0) {
    return map
  }
  const lines = operationOrderBody.split('\n')
  let currentTitle: string | null = null
  let currentLines: string[] = []
  const flush = () => {
    if (currentTitle != null) {
      map.set(currentTitle, currentLines.join('\n').replace(/\n+$/, ''))
    }
  }
  for (const line of lines) {
    const headingMatch = line.match(/^### TASK \d+ — (.+?)\s*$/)
    if (headingMatch != null) {
      flush()
      currentTitle = headingMatch[1]
      currentLines = [line]
      continue
    }
    if (currentTitle != null) {
      currentLines.push(line)
    }
  }
  flush()
  return map
}
