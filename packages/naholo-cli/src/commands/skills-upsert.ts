import fs from 'node:fs'
import { Command } from 'commander'
import { getCliContext } from '../context.js'
import { CliError, withErrorHandling } from '../errors.js'

export const upsertCommand = new Command('upsert')
  .description('Create or update a skill on the server')
  .argument('<skillLoadoutSlug>', 'slug of the skill loadout')
  .argument('<skillName>', 'name of the skill')
  .argument('<skillPath>', 'path to the skill file')
  .action(
    withErrorHandling(
      async (
        skillLoadoutSlug: string,
        skillName: string,
        skillPath: string,
      ) => {
        const { client, projectSlug } = getCliContext()

        if (!fs.existsSync(skillPath)) {
          throw new CliError(`File not found: ${skillPath}`)
        }

        const content = fs.readFileSync(skillPath, 'utf-8')
        await client.upsertSkill(projectSlug, skillLoadoutSlug, skillName, {
          content,
        })

        console.log(
          `Upserted skill '${skillName}' in skill loadout '${skillLoadoutSlug}'`,
        )
      },
    ),
  )
