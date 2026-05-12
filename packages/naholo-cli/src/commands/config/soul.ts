import { Command } from 'commander'
import { CliError, withErrorHandling } from '../../errors.js'
import { getActiveProfile, writeProfile } from '../../profile.js'
import { pickSoul } from '../../soul.js'

export const soulCommand = new Command('soul')
  .description('Choose a soul for the active profile')
  .action(
    withErrorHandling(async () => {
      const active = getActiveProfile()
      if (active == null) {
        throw new CliError('Not logged in. Run "naholo login" first.')
      }

      const soul = await pickSoul()
      writeProfile(active.name, { ...active.profile, soul })

      console.log(`Soul saved for profile "${active.name}".`)
    }),
  )
