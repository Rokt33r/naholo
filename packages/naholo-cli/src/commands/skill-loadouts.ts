import { Command } from 'commander'
import confirm from '@inquirer/confirm'
import { getCliContext } from '../context.js'
import { CliError, withErrorHandling } from '../errors.js'

const createCommand = new Command('create')
  .description('Create a new skill loadout')
  .requiredOption('--name <name>', 'display name')
  .requiredOption('--slug <slug>', 'URL-safe identifier')
  .action(
    withErrorHandling(async (options: { name: string; slug: string }) => {
      const { client, projectSlug } = getCliContext()

      await client.createSkillLoadout(projectSlug, {
        name: options.name,
        slug: options.slug,
      })

      console.log(`Created skill loadout '${options.name}' (${options.slug})`)
    }),
  )

const updateCommand = new Command('update')
  .description('Update a skill loadout')
  .argument('<skillLoadoutSlug>', 'slug of the skill loadout to update')
  .option('--name <name>', 'new display name')
  .option('--slug <slug>', 'new slug')
  .action(
    withErrorHandling(
      async (
        skillLoadoutSlug: string,
        options: { name?: string; slug?: string },
      ) => {
        if (options.name == null && options.slug == null) {
          throw new CliError('Provide at least one of --name or --slug')
        }

        const { client, projectSlug } = getCliContext()

        const input: { name?: string; slug?: string } = {}
        if (options.name != null) {
          input.name = options.name
        }
        if (options.slug != null) {
          input.slug = options.slug
        }

        await client.updateSkillLoadout(projectSlug, skillLoadoutSlug, input)

        console.log(`Updated skill loadout '${skillLoadoutSlug}'`)
      },
    ),
  )

const deleteCommand = new Command('delete')
  .description('Delete a skill loadout')
  .argument('<skillLoadoutSlug>', 'slug of the skill loadout to delete')
  .action(
    withErrorHandling(async (skillLoadoutSlug: string) => {
      const shouldDelete = await confirm({
        message: `Delete skill loadout '${skillLoadoutSlug}' and all its skills?`,
        default: false,
      })

      if (!shouldDelete) {
        console.log('Cancelled.')
        return
      }

      const { client, projectSlug } = getCliContext()

      await client.deleteSkillLoadout(projectSlug, skillLoadoutSlug)

      console.log(`Deleted skill loadout '${skillLoadoutSlug}'`)
    }),
  )

export const loadoutsCommand = new Command('loadouts').description(
  'Manage skill loadouts',
)

loadoutsCommand.addCommand(createCommand)
loadoutsCommand.addCommand(updateCommand)
loadoutsCommand.addCommand(deleteCommand)
