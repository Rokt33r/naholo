import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import { CliError, withErrorHandling } from '../../errors.js'
import { readOpYml } from '../../lib/local-operations.js'
import { pushOp } from '../../lib/push-op.js'

export const sitrepCommand = new Command('sitrep')
  .description('Push the infiled operation and post an operation log')
  .requiredOption('--log <content>', 'Log content posted to the operation feed')
  .action(
    withErrorHandling(async (options: { log: string }) => {
      const log = options.log.trim()
      if (log.length === 0) {
        throw new CliError('`--log` content must not be empty.')
      }

      const opYml = readOpYml()
      if (opYml == null) {
        throw new CliError(
          'No infiled operation. Run "naholo agent infil <n>" first.',
        )
      }
      const opNum = opYml.number
      const { client, projectSlug } = getCliContext()

      await pushOp()

      await client.createOperationLog(projectSlug, opNum, { content: log })
    }),
  )
