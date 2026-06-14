import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import { renderOpStatusYaml } from '../../lib/local-operations.js'
import { getActiveProfile } from '../../profile.js'
import manualText from './manual.md'

export const bootCommand = new Command('boot')
  .description(
    'Print personality, manual, and op status in one XML-delimited payload',
  )
  .action(
    withErrorHandling(async () => {
      const soul = getActiveProfile()?.profile.soul
      const personalityBlock =
        soul != null && soul !== ''
          ? `<personality>\n${soul}\n</personality>\n\n`
          : ''
      const opStatusBody = renderOpStatusYaml() ?? 'No infiled operation.\n'
      process.stdout.write(
        personalityBlock +
          `<manual>\n${manualText}\n</manual>\n\n` +
          `<op_status>\n${opStatusBody}</op_status>\n`,
      )
    }),
  )
