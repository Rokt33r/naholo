import { Command } from 'commander'
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

    // Verify token is still valid
    try {
      const res = await fetch(`${profile.baseUrl}/api/auth/user`, {
        headers: {
          Authorization: `Bearer ${profile.token}`,
        },
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          console.error(
            'Token is invalid or expired. Run "naholo login" to re-authenticate.',
          )
          process.exit(2)
        }
        console.error(`Server error: ${res.status}`)
        process.exit(1)
      }

      const user = (await res.json()) as {
        id?: string
        email?: string
        name?: string
      }

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
    } catch (err) {
      console.error(
        'Failed to connect to server:',
        err instanceof Error ? err.message : err,
      )
      process.exit(1)
    }
  })
