import { Command } from 'commander'
import { getCliContext } from '../context.js'
import { readPulledSkill } from '../skills.js'

export const getCommand = new Command('get')
  .description('Fetch and display a skill from the server')
  .argument('<skill-name>', 'name of the skill to fetch')
  .action(async (skillName: string) => {
    const ctx = getCliContext()
    const { client, projectConfig } = ctx

    // Check if local pulled skill is conflicted
    const local = readPulledSkill(skillName)
    if (local != null && local.meta.conflicted) {
      console.error(
        `Error: Skill "${skillName}" has unresolved conflicts. Resolve the conflict and remove "conflicted: true" from the frontmatter before using this skill.`,
      )
      process.exit(1)
    }

    // Look up skill ID from alias record
    const skillId = projectConfig.skillAliasRecord?.[skillName]
    if (skillId == null) {
      console.error(
        `Skill "${skillName}" not found in alias map. Run "naholo skills sync-alias" first.`,
      )
      process.exit(1)
    }

    try {
      const skill = await client.getSkill(projectConfig.projectId, skillId)
      console.log(skill.content)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('404')) {
        console.error(
          `Skill "${skillName}" no longer exists on the server. Run "naholo skills sync-alias" to update.`,
        )
        process.exit(1)
      }
      throw error
    }
  })
