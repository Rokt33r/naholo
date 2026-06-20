import { Command } from 'commander'
import { NoProjectStateCliError, withErrorHandling } from '../../errors.js'
import { getProjectState } from '../../lib/project-state.js'
import { getActiveProfile } from '../../profile.js'
import manualText from './manual.md'

export const bootCommand = new Command('boot')
  .description(
    'Print personality, manual, locale, and op status in one XML-delimited payload',
  )
  .action(
    withErrorHandling(async () => {
      const profile = getActiveProfile()?.profile
      const soul = profile?.soul
      const personalityBlock =
        soul != null && soul !== ''
          ? `<personality>\n${soul}\n</personality>\n\n`
          : ''
      const locale = profile?.locale ?? 'English'
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }
      const opStatusBody =
        projectState.renderOpStatusYaml() ?? 'No infilled operation.\n'
      process.stdout.write(
        personalityBlock +
          `<manual>\n${manualText}\n</manual>\n\n` +
          `<locale>${locale}</locale>\n\n` +
          `<op_status>\n${opStatusBody}</op_status>\n`,
      )
    }),
  )
