import fs from 'node:fs'
import path from 'node:path'

const CLAUDE_SKILLS_DIR = '.claude/skills'

export function writeSkillFile(name: string, content: string): void {
  const skillDir = path.resolve(CLAUDE_SKILLS_DIR, name)
  const skillMdPath = path.join(skillDir, 'SKILL.md')

  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(skillMdPath, content, 'utf-8')
}
