import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import select from '@inquirer/select'
import { coreSkills } from '../core-skills.js'
import { withErrorHandling } from '../errors.js'
import { writeSkillFile } from '../skills.js'

const CLAUDE_SKILLS_DIR = '.claude/skills'

export async function installSkills(
  skills: { name: string; content: string }[],
): Promise<void> {
  let overwriteAll = false
  let skipAll = false

  for (const skill of skills) {
    const skillPath = path.resolve(CLAUDE_SKILLS_DIR, skill.name, 'SKILL.md')
    const exists = fs.existsSync(skillPath)

    if (!exists) {
      writeSkillFile(skill.name, skill.content)
      console.log(`  Created: ${skill.name}`)
      continue
    }

    if (overwriteAll) {
      writeSkillFile(skill.name, skill.content)
      console.log(`  Overwritten: ${skill.name}`)
      continue
    }

    if (skipAll) {
      console.log(`  Skipped: ${skill.name}`)
      continue
    }

    const answer = await select({
      message: `Overwrite ${skill.name}?`,
      choices: [
        { name: 'Yes', value: 'yes' },
        { name: 'No', value: 'no' },
        { name: 'Yes to all', value: 'all' },
        { name: 'No to all', value: 'skip-all' },
      ],
      default: 'no',
    })

    if (answer === 'no') {
      console.log(`  Skipped: ${skill.name}`)
      continue
    }
    if (answer === 'skip-all') {
      skipAll = true
      console.log(`  Skipped: ${skill.name}`)
      continue
    }
    if (answer === 'all') {
      overwriteAll = true
    }

    writeSkillFile(skill.name, skill.content)
    console.log(`  Overwritten: ${skill.name}`)
  }
}

export const installCommand = new Command('install')
  .description('Install bundled core skills into .claude/skills/')
  .action(
    withErrorHandling(async () => {
      await installSkills(coreSkills)
    }),
  )
