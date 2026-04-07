import { Command } from 'commander'
import { getCliContext } from '../context.js'
import { readPulledSkill } from '../skills.js'

export const getCommand = new Command('get')
  .description('Fetch and display a skill')
  .argument('<skill-name>', 'name of the skill to fetch')
  .action(async (skillName: string) => {
    const ctx = getCliContext()
    const { client, projectConfig } = ctx

    // 1. Check local pulled skill first (prefer local edits)
    const local = readPulledSkill(skillName)
    if (local != null) {
      if (local.meta.conflicted) {
        console.error(
          `Error: Skill "${skillName}" has unresolved conflicts. Resolve the conflict and remove "conflicted: true" from the frontmatter before using this skill.`,
        )
        process.exit(1)
      }

      console.log(local.content)
      return
    }

    // 2. No local pulled skill — fetch from server by name
    try {
      const skill = await client.getSkill(projectConfig.projectId, skillName)
      console.log(skill.content)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('404')) {
        console.error(`Skill "${skillName}" not found on the server.`)
        process.exit(1)
      }
      throw error
    }
  })
