import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { CliError, withErrorHandling } from '../../errors.js'
import { readOpYml } from '../../lib/local-operations.js'

export const opUrlCommand = new Command('op-url')
  .description('Print the Naholo web app URL for an operation')
  .action(
    withErrorHandling(async () => {
      const { currentProfile, projectSlug } = getCliContext()
      const opYml = readOpYml()
      if (opYml == null) {
        throw new CliError(
          'No infiled operation. Run "naholo agent infil <n>" first.',
        )
      }
      const baseUrl = currentProfile.profile.baseUrl.replace(/\/$/, '')
      console.log(
        `${baseUrl}/app/projects/${projectSlug}/operations/${opYml.number}`,
      )
    }),
  )
