import { Command } from 'commander'
import { getCliContext } from '../../context.js'
import {
  CliError,
  NoInfiledOpCliError,
  NoProjectStateCliError,
  withErrorHandling,
} from '../../errors.js'
import { getProjectState } from '../../lib/project-state.js'
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

      const cliContext = getCliContext()
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }
      const opYml = projectState.readOpYml()
      if (opYml == null) {
        throw new NoInfiledOpCliError()
      }
      const opNum = opYml.number
      const projectSlug = projectState.config.projectSlug

      await pushOp(cliContext, projectState)

      await cliContext.client.createOperationLog(projectSlug, opNum, {
        content: log,
      })
    }),
  )
