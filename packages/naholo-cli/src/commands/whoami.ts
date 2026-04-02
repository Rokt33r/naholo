import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import { getActiveProfile } from '../profile.js'

export const whoamiCommand = new Command('whoami')
  .description('Show current user and profile info')
  .action(async (_options: Record<string, unknown>, cmd: Command) => {
    const profileOverride = cmd.parent?.opts().profile as string | undefined

    const active = getActiveProfile(profileOverride)
    if (!active) {
      console.error('Not logged in. Run "naholo login" to authenticate.')
      process.exit(2)
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
        console.error(
          'Token is invalid or expired. Run "naholo login" to re-authenticate.',
        )
        process.exit(2)
      }
      console.error('Failed to connect to server:', message)
      process.exit(1)
    }
  })
