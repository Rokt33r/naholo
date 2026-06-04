export type ParsedOperationMd = {
  number: number
  title: string
  situation: string
  mission: {
    coo: string
    woBlock: string
    trpBlock: string
  }
  executionByTitle: Map<string, string>
}

export function parseOperationMd(md: string): ParsedOperationMd {
  const headingMatch = md.match(/^# OP #(\d+):\s*(.+?)\s*$/m)
  if (headingMatch == null) {
    throw new Error('OPERATION.md is missing the `# OP #N: Title` heading')
  }
  const number = Number(headingMatch[1])
  const title = headingMatch[2]

  const situation = extractLevel2Body(md, 'SITUATION')
  const missionBody = extractLevel2Body(md, 'MISSION')
  const executionBody = extractLevel2Body(md, 'EXECUTION')

  const coo = extractLevel3Body(missionBody, 'Concept of Operations')
  const woBlock = extractLevel3Body(missionBody, 'Warning Orders')
  const trpBlock = extractLevel3Body(missionBody, 'Target Reference Points')

  const executionByTitle = parseExecutionSections(executionBody)

  return {
    number,
    title,
    situation,
    mission: { coo, woBlock, trpBlock },
    executionByTitle,
  }
}

export function pruneCarvedWosFromBlock(
  woBlock: string,
  carvedLabels: Set<string>,
): string {
  const bullets = parseWoBullets(woBlock)
  const kept = bullets.filter((b) => !carvedLabels.has(b.label))
  return joinWoBullets(kept)
}

export function composeParentOperationMd(parsed: ParsedOperationMd): string {
  const parts: string[] = []
  parts.push(`# OP #${parsed.number}: ${parsed.title}`)
  parts.push('')
  parts.push('## SITUATION')
  parts.push('')
  parts.push(parsed.situation.trim())
  parts.push('')
  parts.push('## MISSION')
  parts.push('')
  parts.push('### Concept of Operations')
  parts.push('')
  parts.push(parsed.mission.coo.trim())
  parts.push('')
  parts.push('### Warning Orders')
  parts.push('')
  parts.push(parsed.mission.woBlock.trim())
  const trp = parsed.mission.trpBlock.trim()
  if (trp.length > 0) {
    parts.push('')
    parts.push('### Target Reference Points')
    parts.push('')
    parts.push(trp)
  }
  if (parsed.executionByTitle.size > 0) {
    parts.push('')
    parts.push('## EXECUTION')
    parts.push('')
    for (const section of parsed.executionByTitle.values()) {
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

export function parseWarningOrderLabels(woBlock: string): string[] {
  return parseWoBullets(woBlock).map((b) => b.label)
}

type WoBullet = { label: string; body: string[] }

function parseWoBullets(woBlock: string): WoBullet[] {
  const bullets: WoBullet[] = []
  let current: WoBullet | null = null
  for (const line of woBlock.split('\n')) {
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

function joinWoBullets(bullets: WoBullet[]): string {
  return bullets.map((b) => b.body.join('\n')).join('\n')
}

function extractLevel2Body(md: string, heading: string): string {
  return extractHeadingBody(md, '##', heading)
}

function extractLevel3Body(parentBody: string, heading: string): string {
  return extractHeadingBody(parentBody, '###', heading)
}

function extractHeadingBody(
  source: string,
  prefix: '##' | '###',
  heading: string,
): string {
  const lines = source.split('\n')
  const target = `${prefix} ${heading}`
  const startIndex = lines.findIndex((line) => line.trim() === target)
  if (startIndex < 0) {
    return ''
  }
  let endIndex = lines.length
  const stopPrefix = prefix === '##' ? '## ' : '### '
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith(stopPrefix)) {
      endIndex = i
      break
    }
  }
  return lines
    .slice(startIndex + 1, endIndex)
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
}

function parseExecutionSections(executionBody: string): Map<string, string> {
  const map = new Map<string, string>()
  if (executionBody.trim().length === 0) {
    return map
  }
  const lines = executionBody.split('\n')
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
