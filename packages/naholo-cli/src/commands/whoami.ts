import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import { CliError, withErrorHandling } from '../errors.js'
import { getActiveProfile } from '../profile.js'

export const whoamiCommand = new Command('whoami')
  .description('Show current user and profile info')
  .option('--profile <name>', 'use a specific profile instead of default')
  .action(
    withErrorHandling(async (options: Record<string, string>, cmd: Command) => {
      const profileOverride =
        typeof options.profile !== 'string' ? options.profile : undefined

      const active = getActiveProfile(profileOverride)
      if (active == null) {
        throw new CliError('Not logged in. Run "naholo login" to authenticate.')
      }

      const { name, profile } = active

      const client = new NaholoClient({
        baseUrl: profile.baseUrl,
        token: profile.token,
      })

      try {
        const user = await client.getAuthUser()

        const parentOpts = cmd.parent?.opts() as { json?: boolean } | undefined
        if (parentOpts?.json) {
          console.log(
            JSON.stringify(
              {
                profile: name,
                baseUrl: profile.baseUrl,
                tokenName: profile.tokenName,
                user,
              },
              null,
              2,
            ),
          )
        } else {
          console.log(`Profile:    ${name}`)
          console.log(`Server:     ${profile.baseUrl}`)
          console.log(`Token name: ${profile.tokenName}`)
          if (user.email) {
            console.log(`Email:      ${user.email}`)
          }
          if (user.name) {
            console.log(`User:       ${user.name}`)
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('401') || message.includes('403')) {
          throw new CliError(
            'Token is invalid or expired. Run "naholo login" to re-authenticate.',
          )
        }
        throw new CliError(`Failed to connect to server: ${message}`)
      }
    }),
  )
