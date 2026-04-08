import { Command } from 'commander'
import confirm from '@inquirer/confirm'
import { getCliContext } from '../context.js'
import { CliError, withErrorHandling } from '../errors.js'

const createCommand = new Command('create')
  .description('Create a new skill set')
  .requiredOption('--name <name>', 'display name')
  .requiredOption('--slug <slug>', 'URL-safe identifier')
  .action(
    withErrorHandling(async (options: { name: string; slug: string }) => {
      const ctx = getCliContext()
      const { client, projectConfig } = ctx

      await client.createSkillSet(projectConfig.projectId, {
        name: options.name,
        slug: options.slug,
      })

      console.log(`Created skill set '${options.name}' (${options.slug})`)
    }),
  )

const updateCommand = new Command('update')
  .description('Update a skill set')
  .argument('<skillSetSlug>', 'slug of the skill set to update')
  .option('--name <name>', 'new display name')
  .option('--slug <slug>', 'new slug')
  .action(
    withErrorHandling(
      async (
        skillSetSlug: string,
        options: { name?: string; slug?: string },
      ) => {
        if (options.name == null && options.slug == null) {
          throw new CliError('Provide at least one of --name or --slug')
        }

        const ctx = getCliContext()
        const { client, projectConfig } = ctx

        const input: { name?: string; slug?: string } = {}
        if (options.name != null) {
          input.name = options.name
        }
        if (options.slug != null) {
          input.slug = options.slug
        }

        await client.updateSkillSet(
          projectConfig.projectId,
          skillSetSlug,
          input,
        )

        console.log(`Updated skill set '${skillSetSlug}'`)
      },
    ),
  )

const deleteCommand = new Command('delete')
  .description('Delete a skill set')
  .argument('<skillSetSlug>', 'slug of the skill set to delete')
  .action(
    withErrorHandling(async (skillSetSlug: string) => {
      const shouldDelete = await confirm({
        message: `Delete skill set '${skillSetSlug}' and all its skills?`,
        default: false,
      })

      if (!shouldDelete) {
        console.log('Cancelled.')
        return
      }

      const ctx = getCliContext()
      const { client, projectConfig } = ctx

      await client.deleteSkillSet(projectConfig.projectId, skillSetSlug)

      console.log(`Deleted skill set '${skillSetSlug}'`)
    }),
  )

export const setsCommand = new Command('sets').description('Manage skill sets')

setsCommand.addCommand(createCommand)
setsCommand.addCommand(updateCommand)
setsCommand.addCommand(deleteCommand)
