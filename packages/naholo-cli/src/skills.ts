import type { NaholoClient } from 'naholo-api/client'
import fs from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Skill stubs (.claude/skills/)
// ---------------------------------------------------------------------------

const CLAUDE_SKILLS_DIR = '.claude/skills'

export function getStubContent(skillName: string): string {
  return `# ${skillName}

Run the command below to get the skill content.

\`\`\`
naholo skills get ${skillName}
\`\`\`

If the skill no longer exists, tell users to run \`naholo skills sync\` and start new session so skills are correctly reflected.
`
}

export async function syncSkills(
  client: NaholoClient,
  projectId: string,
): Promise<void> {
  // 1. Fetch skill list from server (summaries only)
  const serverSkills = await client.listSkills(projectId)

  // 2. Flush all skill stubs
  const claudeSkillsDir = path.resolve(CLAUDE_SKILLS_DIR)
  if (fs.existsSync(claudeSkillsDir)) {
    for (const entry of fs.readdirSync(claudeSkillsDir)) {
      const entryDir = path.join(claudeSkillsDir, entry)
      const stat = fs.statSync(entryDir)
      if (stat.isDirectory()) {
        fs.rmSync(entryDir, { recursive: true, force: true })
      }
    }
  }

  // 3. For each server skill, create stub
  for (const skill of serverSkills) {
    const skillDir = path.resolve(CLAUDE_SKILLS_DIR, skill.name)
    const skillMdPath = path.join(skillDir, 'SKILL.md')

    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(skillMdPath, getStubContent(skill.name), 'utf-8')
    console.log(`  Synced: ${skill.name}`)
  }

  console.log('Skills synced.')
}

// ---------------------------------------------------------------------------
// Pulled skills
// ---------------------------------------------------------------------------

const PULLED_SKILLS_DIR = path.join('.naholo', 'local', 'skills')
const CONFLICTED_DIR = path.join(PULLED_SKILLS_DIR, 'conflicted')

export interface PulledSkillMeta {
  revisionId?: string
  conflicted?: boolean
}

export interface PulledSkill {
  meta: PulledSkillMeta
  content: string
}

export function getPulledSkillPath(name: string): string {
  return path.resolve(PULLED_SKILLS_DIR, `${name}.md`)
}

export function getConflictedDir(): string {
  return path.resolve(CONFLICTED_DIR)
}

export function readPulledSkill(name: string): PulledSkill | null {
  const filePath = getPulledSkillPath(name)
  if (!fs.existsSync(filePath)) {
    return null
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  return parsePulledSkill(raw)
}

export function writePulledSkill(
  name: string,
  meta: PulledSkillMeta,
  content: string,
): void {
  const filePath = getPulledSkillPath(name)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  const frontmatterLines = ['---']
  if (meta.revisionId != null) {
    frontmatterLines.push(`revisionId: ${meta.revisionId}`)
  }
  if (meta.conflicted) {
    frontmatterLines.push('conflicted: true')
  }
  frontmatterLines.push('---')

  const frontmatter = frontmatterLines.join('\n')
  fs.writeFileSync(filePath, `${frontmatter}\n\n${content}`, 'utf-8')
}

export function backupPulledSkill(skillName: string): string {
  const conflictedDir = getConflictedDir()
  fs.mkdirSync(conflictedDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(conflictedDir, `${skillName}-${timestamp}.md`)
  fs.copyFileSync(getPulledSkillPath(skillName), backupPath)
  return backupPath
}

export function writeConflictMarkers(
  skillName: string,
  localContent: string,
  serverContent: string,
  serverRevisionId: string,
): void {
  const mergedContent = [
    '<<<<<<< LOCAL',
    localContent,
    '=======',
    serverContent,
    '>>>>>>> SERVER',
  ].join('\n')

  writePulledSkill(
    skillName,
    {
      revisionId: serverRevisionId,
      conflicted: true,
    },
    mergedContent,
  )
}

export function removePulledSkill(name: string): void {
  const filePath = getPulledSkillPath(name)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

function parsePulledSkill(raw: string): PulledSkill | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/)
  if (match == null) {
    return null
  }

  const frontmatterBlock = match[1]
  const content = match[2]

  const meta: PulledSkillMeta = {}
  for (const line of frontmatterBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) {
      continue
    }
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (key === 'revisionId') {
      meta.revisionId = value
    } else if (key === 'conflicted') {
      meta.conflicted = value === 'true'
    }
  }

  return { meta, content }
}
