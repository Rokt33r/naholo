import input from '@inquirer/input'
import select from '@inquirer/select'
import type { NaholoClient } from 'naholo-api/client'
import fs from 'node:fs'
import path from 'node:path'
import { readProjectConfig, writeProjectConfig } from './project-config.js'

// ---------------------------------------------------------------------------
// Skill alias record
// ---------------------------------------------------------------------------

const CLAUDE_SKILLS_DIR = '.claude/skills'

export function readSkillAliasRecord(): Record<string, string> {
  const config = readProjectConfig()
  return config?.skillAliasRecord ?? {}
}

function writeSkillAliasRecord(record: Record<string, string>): void {
  const config = readProjectConfig()
  if (config == null) {
    throw new Error('Project config not found. Run "naholo init" first.')
  }
  writeProjectConfig({ ...config, skillAliasRecord: record })
}

function getAliasSkillContent(skillName: string): string {
  return `# ${skillName}

Run the command below to get the skill content.

\`\`\`
naholo skills get ${skillName}
\`\`\`

If the skill no longer exists, tell users to run \`naholo skills sync-alias\` and start new session so skills are correctly reflected.
`
}

export async function syncSkillAliases(
  client: NaholoClient,
  projectId: string,
): Promise<void> {
  // 1. Fetch skill list from server (summaries only — no content)
  const serverSkills = await client.listSkills(projectId)

  // 2. Build alias ↔ skillId maps
  const { aliasToIdMap, idToAliasMap } = Object.entries(
    readSkillAliasRecord(),
  ).reduce(
    (acc, [alias, id]) => {
      acc.aliasToIdMap.set(alias, id)
      acc.idToAliasMap.set(id, alias)
      return acc
    },
    {
      aliasToIdMap: new Map<string, string>(),
      idToAliasMap: new Map<string, string>(),
    },
  )

  // 3. For each server skill, create or update stub
  for (const skill of serverSkills) {
    const existingAlias = idToAliasMap.get(skill.id)
    const currentName = existingAlias ?? skill.name

    const skillDir = path.resolve(CLAUDE_SKILLS_DIR, currentName)
    const skillMdPath = path.join(skillDir, 'SKILL.md')

    // Check for conflict with non-naholo skill
    if (
      fs.existsSync(skillMdPath) &&
      !aliasToIdMap.has(currentName) &&
      existingAlias == null
    ) {
      const action = await select<string>({
        message: `Skill "${currentName}" conflicts with an existing local skill. What to do?`,
        choices: [
          { name: 'Use an alternative name', value: 'rename' },
          { name: 'Replace existing local skill', value: 'replace' },
        ],
      })

      if (action === 'rename') {
        const altName = await input({
          message: `Enter an alternative name for "${currentName}":`,
          default: `${currentName}--naholo`,
        })
        const altDir = path.resolve(CLAUDE_SKILLS_DIR, altName)
        fs.mkdirSync(altDir, { recursive: true })
        fs.writeFileSync(
          path.join(altDir, 'SKILL.md'),
          getAliasSkillContent(skill.name),
          'utf-8',
        )
        aliasToIdMap.set(altName, skill.id)
        idToAliasMap.set(skill.id, altName)
        console.log(`  Synced: ${altName} → ${skill.name}`)
        continue
      }
    }

    // Create/update stub
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(skillMdPath, getAliasSkillContent(skill.name), 'utf-8')
    aliasToIdMap.set(currentName, skill.id)
    idToAliasMap.set(skill.id, currentName)
    console.log(`  Synced: ${currentName}`)
  }

  // 4. Remove skill folders that no longer exist on server (only naholo-managed ones)
  const serverSkillIdSet = new Set(serverSkills.map((skill) => skill.id))
  for (const [aliasName, skillId] of aliasToIdMap) {
    const stillExists = serverSkillIdSet.has(skillId)
    if (!stillExists) {
      const skillDir = path.resolve(CLAUDE_SKILLS_DIR, aliasName)
      fs.rmSync(skillDir, { recursive: true, force: true })
      aliasToIdMap.delete(aliasName)
      idToAliasMap.delete(skillId)
      console.log(`  Removed: ${aliasName} (skill deleted on server)`)
    }
  }

  // 5. Write updated skill alias record
  writeSkillAliasRecord(Object.fromEntries(aliasToIdMap))
  console.log('Skill aliases synced.')
}

// ---------------------------------------------------------------------------
// Pulled skills
// ---------------------------------------------------------------------------

const PULLED_SKILLS_DIR = path.join('.naholo', 'local', 'skills')
const CONFLICTED_DIR = path.join(PULLED_SKILLS_DIR, 'conflicted')

export interface PulledSkillMeta {
  revisionId: string
  skillId: string
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

  const frontmatter = [
    '---',
    `revisionId: ${meta.revisionId}`,
    `skillId: ${meta.skillId}`,
    ...(meta.conflicted ? ['conflicted: true'] : []),
    '---',
  ].join('\n')

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
  skillId: string,
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
      skillId,
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

  const meta: Partial<PulledSkillMeta> = {}
  for (const line of frontmatterBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) {
      continue
    }
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    if (key === 'revisionId') {
      meta.revisionId = value
    } else if (key === 'skillId') {
      meta.skillId = value
    } else if (key === 'conflicted') {
      meta.conflicted = value === 'true'
    }
  }

  if (meta.revisionId == null || meta.skillId == null) {
    return null
  }

  return { meta: meta as PulledSkillMeta, content }
}
