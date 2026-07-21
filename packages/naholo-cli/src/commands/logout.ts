import { Command } from 'commander'
import { CliError, withErrorHandling } from '../errors'
import { getDefaultProfileName, setDefaultProfile } from '../global-config'
import { deleteProfile, readProfile } from '../profile'

export const logoutCommand = new Command('logout')
  .description('Log out and remove stored credentials')
  .option('--profile <name>', 'profile to log out of')
  .action(
    withErrorHandling(async (options: { profile?: string }) => {
      const profileName = options.profile ?? getDefaultProfileName()

      if (profileName == null) {
        throw new CliError(
          'No profile specified and no default profile set. Nothing to log out of.',
        )
      }

      const profile = readProfile(profileName)
      if (profile == null) {
        throw new CliError(`Profile "${profileName}" not found.`)
      }

      // Attempt to revoke the token on the server
      try {
        const res = await fetch(`${profile.baseUrl}/api/auth/user/token`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${profile.token}`,
          },
        })

        if (!res.ok) {
          const body = await res.text()
          console.warn(
            `Warning: Failed to revoke token on server (${res.status}): ${body}`,
          )
          console.warn(
            'You may need to manually revoke this token in the web app.',
          )
        }
      } catch (error) {
        console.warn(
          `Warning: Could not reach server to revoke token: ${error instanceof Error ? error.message : error}`,
        )
        console.warn(
          'You may need to manually revoke this token in the web app.',
        )
      }

      deleteProfile(profileName)
      setDefaultProfile(null)

      console.log(`Logged out of "${profileName}".`)
    }),
  )
