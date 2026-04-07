import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import select from '@inquirer/select'
import confirm from '@inquirer/confirm'
import { getCliContext } from '../context.js'
import { writeSkillFile } from '../skills.js'

const CLAUDE_SKILLS_DIR = '.claude/skills'

export const installCommand = new Command('install')
  .description('Install skills from a skill set')
  .action(async () => {
    const ctx = getCliContext()
    const { client, projectConfig } = ctx

    const skillSets = await client.listSkillSets(projectConfig.projectId)
    if (skillSets.length === 0) {
      console.log('No skill sets found.')
      return
    }

    const selectedSlug = await select({
      message: 'Select a skill set to install',
      choices: skillSets.map((s) => ({
        name: `${s.name} (${s.slug})`,
        value: s.slug,
      })),
    })

    const selectedSet = skillSets.find((s) => s.slug === selectedSlug)!
    const skills = await client.listSkills(
      projectConfig.projectId,
      selectedSlug,
    )

    if (skills.length === 0) {
      console.log(`No skills in "${selectedSet.name}".`)
      return
    }

    for (const summary of skills) {
      const skill = await client.getSkill(
        projectConfig.projectId,
        selectedSlug,
        summary.name,
      )

      const skillPath = path.resolve(
        CLAUDE_SKILLS_DIR,
        summary.name,
        'SKILL.md',
      )
      const exists = fs.existsSync(skillPath)

      if (exists) {
        const overwrite = await confirm({
          message: `Overwrite ${summary.name}?`,
          default: true,
        })
        if (!overwrite) {
          console.log(`  Skipped: ${summary.name}`)
          continue
        }
        writeSkillFile(summary.name, skill.content)
        console.log(`  Overwritten: ${summary.name}`)
      } else {
        writeSkillFile(summary.name, skill.content)
        console.log(`  Created: ${summary.name}`)
      }
    }
  })
