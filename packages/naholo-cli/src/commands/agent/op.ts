import { Command } from 'commander'
import { CliError, withErrorHandling } from '../../errors.js'
import { readOpYml } from '../../lib/local-operations.js'

export const opCommand = new Command('op')
  .description('Print the infiled operation as #{number} {title}')
  .action(
    withErrorHandling(async () => {
      const opYml = readOpYml()
      if (opYml == null) {
        throw new CliError(
          'No infiled operation. Run "naholo agent infil <n>" first.',
        )
      }
      console.log(`#${opYml.number} ${opYml.title}`)
    }),
  )
