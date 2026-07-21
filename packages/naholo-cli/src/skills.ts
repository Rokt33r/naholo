import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { CliError } from './errors'

const CLAUDE_SKILLS_DIR = '.claude/skills'

export function getProjectSkillsDir(): string {
  return path.resolve(CLAUDE_SKILLS_DIR)
}

export function getGlobalSkillsDir(): string {
  return path.join(os.homedir(), '.claude', 'skills')
}

export function writeSkillFile(
  name: string,
  content: string,
  baseDir: string,
): void {
  const skillDir = path.join(baseDir, name)
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

export function buildSkillStub(name: string, content: string): string {
  const { frontmatter } = splitSkill(content)
  return `${frontmatter}\nRun \`naholo agent skills ${name}\` and follow stdout.\n\nIf \`naholo\` is not found or the command errors, tell the user to run \`/naholo-doctor\` to diagnose and fix the CLI setup, then stop.\n`
}

export interface LegacyStub {
  name: string
  path: string
  scope: 'global' | 'project'
}

export function findLegacyStubs(skills: { name: string }[]): LegacyStub[] {
  const scopes: { scope: 'global' | 'project'; dir: string }[] = [
    { scope: 'global', dir: getGlobalSkillsDir() },
    { scope: 'project', dir: getProjectSkillsDir() },
  ]
  const stubs: LegacyStub[] = []
  for (const { scope, dir } of scopes) {
    for (const skill of skills) {
      const skillPath = path.join(dir, skill.name, 'SKILL.md')
      if (!fs.existsSync(skillPath)) {
        continue
      }
      const onDisk = fs.readFileSync(skillPath, 'utf-8')
      if (!onDisk.includes(`\`naholo agent skills ${skill.name}\``)) {
        continue
      }
      stubs.push({ name: skill.name, path: skillPath, scope })
    }
  }
  return stubs
}
