import { Command } from 'commander'
import { CliError, withErrorHandling } from '../../errors.js'
import { pickLocale } from '../../locale.js'
import { getActiveProfile, writeProfile } from '../../profile.js'

export const localeCommand = new Command('locale')
  .description('Choose a locale for the active profile')
  .action(
    withErrorHandling(async () => {
      const active = getActiveProfile()
      if (active == null) {
        throw new CliError('Not logged in. Run "naholo login" first.')
      }

      const locale = await pickLocale()
      writeProfile(active.name, { ...active.profile, locale })

      console.log(`Locale saved for profile "${active.name}".`)
    }),
  )
