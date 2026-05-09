import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { withErrorHandling } from '../../errors.js'

export const opUrlCommand = new Command('op-url')
  .description('Print the Naholo web app URL for an operation')
  .argument('<operationNumber>', 'Operation number')
  .action(
    withErrorHandling(async (operationNumber: string) => {
      const { currentProfile, projectSlug } = getCliContext()
      const baseUrl = currentProfile.profile.baseUrl.replace(/\/$/, '')
      console.log(
        `${baseUrl}/app/projects/${projectSlug}/operations/${operationNumber}`,
      )
    }),
  )
