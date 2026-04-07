import fs from 'node:fs'
import { Command } from 'commander'
import { getCliContext } from '../context.js'

export const upsertCommand = new Command('upsert')
  .description('Create or update a skill on the server')
  .argument('<skillSetSlug>', 'slug of the skill set')
  .argument('<skillName>', 'name of the skill')
  .argument('<skillPath>', 'path to the skill file')
  .action(
    async (skillSetSlug: string, skillName: string, skillPath: string) => {
      const ctx = getCliContext()
      const { client, projectConfig } = ctx

      if (!fs.existsSync(skillPath)) {
        console.error(`File not found: ${skillPath}`)
        process.exit(1)
      }

      const content = fs.readFileSync(skillPath, 'utf-8')
      await client.upsertSkill(
        projectConfig.projectId,
        skillSetSlug,
        skillName,
        {
          content,
        },
      )

      console.log(
        `Upserted skill '${skillName}' in skill set '${skillSetSlug}'`,
      )
    },
  )
