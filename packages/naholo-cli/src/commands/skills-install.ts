import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import select from '@inquirer/select'
import { getCliContext } from '../context.js'
import { CORE_LOADOUT_NAME, coreSkills } from '../core-skills.js'
import { withErrorHandling } from '../errors.js'
import { writeSkillFile } from '../skills.js'

const CLAUDE_SKILLS_DIR = '.claude/skills'

export async function installSkills(
  skills: { name: string; content: string }[],
): Promise<void> {
  let overwriteAll = false

  for (const skill of skills) {
    const skillPath = path.resolve(CLAUDE_SKILLS_DIR, skill.name, 'SKILL.md')
    const exists = fs.existsSync(skillPath)

    if (exists && !overwriteAll) {
      const answer = await select({
        message: `Overwrite ${skill.name}?`,
        choices: [
          { name: 'Yes', value: 'yes' },
          { name: 'No', value: 'no' },
          { name: 'Yes to all', value: 'all' },
        ],
        default: 'no',
      })

      if (answer === 'no') {
        console.log(`  Skipped: ${skill.name}`)
        continue
      }
      if (answer === 'all') {
        overwriteAll = true
      }

      writeSkillFile(skill.name, skill.content)
      console.log(`  Overwritten: ${skill.name}`)
    } else if (exists) {
      writeSkillFile(skill.name, skill.content)
      console.log(`  Overwritten: ${skill.name}`)
    } else {
      writeSkillFile(skill.name, skill.content)
      console.log(`  Created: ${skill.name}`)
    }
  }
}

export const installCommand = new Command('install')
  .description('Install skills from a skill loadout')
  .argument('[loadout-name]', 'loadout name (use "core" for built-in skills)')
  .action(
    withErrorHandling(async (loadoutName?: string) => {
      // Direct core install — no API needed
      if (loadoutName === CORE_LOADOUT_NAME) {
        await installSkills(coreSkills)
        return
      }

      const { client, projectSlug } = getCliContext()

      // Direct remote install by slug
      if (loadoutName != null) {
        const skills = await client.listSkills(projectSlug, loadoutName, {
          with: 'content',
        })

        if (skills.length === 0) {
          console.log(`No skills in "${loadoutName}".`)
          return
        }

        await installSkills(
          skills.map((s) => ({ name: s.name, content: s.content })),
        )
        return
      }

      // No argument — show combined select prompt
      const remoteLoadouts = await client.listSkillLoadouts(projectSlug)

      const choices = [
        { name: `core (built-in)`, value: CORE_LOADOUT_NAME },
        ...remoteLoadouts.map((s) => ({
          name: `${s.name} (${s.slug})`,
          value: s.slug,
        })),
      ]

      const selectedSlug = await select({
        message: 'Select a skill loadout to install',
        choices,
      })

      if (selectedSlug === CORE_LOADOUT_NAME) {
        await installSkills(coreSkills)
        return
      }

      const skills = await client.listSkills(projectSlug, selectedSlug, {
        with: 'content',
      })

      if (skills.length === 0) {
        const loadout = remoteLoadouts.find((s) => s.slug === selectedSlug)
        console.log(`No skills in "${loadout?.name ?? selectedSlug}".`)
        return
      }

      await installSkills(
        skills.map((s) => ({ name: s.name, content: s.content })),
      )
    }),
  )
