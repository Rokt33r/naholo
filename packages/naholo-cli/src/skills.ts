import fs from 'node:fs'
import path from 'node:path'
import { CliError } from './errors.js'

const CLAUDE_SKILLS_DIR = '.claude/skills'

export function writeSkillFile(name: string, content: string): void {
  const skillDir = path.resolve(CLAUDE_SKILLS_DIR, name)
  const skillMdPath = path.join(skillDir, 'SKILL.md')

  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(skillMdPath, content, 'utf-8')
}

export function splitSkill(content: string): {
  frontmatter: string
  body: string
} {
  const match = content.match(/^---\n([\s\S]*?\n)---\n?([\s\S]*)$/)
  if (match == null) {
    throw new CliError('Skill content is missing a YAML frontmatter block.')
  }
  const [, inner, rest] = match
  const frontmatter = `---\n${inner}---\n`
  const body = rest.replace(/^\n+/, '')
  return { frontmatter, body }
}
