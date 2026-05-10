import { Command } from 'commander'
import { CliError, withErrorHandling } from '../../errors.js'
import { getLocalOperationDir, readOpYml } from '../../lib/local-operations.js'

export const opPathCommand = new Command('op-path')
  .description('Print the absolute local directory of the infiled operation')
  .action(
    withErrorHandling(async () => {
      if (readOpYml() == null) {
        throw new CliError(
          'No infiled operation. Run "naholo agent infil <n>" first.',
        )
      }
      console.log(getLocalOperationDir())
    }),
  )
