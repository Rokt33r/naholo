import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import { getLocalOperationDir } from '../../lib/local-operations.js'

export const opPathCommand = new Command('op-path')
  .description('Print the absolute local directory for an operation')
  .argument('<operationNumber>', 'Operation number')
  .action(
    withErrorHandling(async (_operationNumber: string) => {
      console.log(getLocalOperationDir())
    }),
  )
