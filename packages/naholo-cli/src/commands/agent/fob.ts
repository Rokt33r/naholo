import { Command } from 'commander'
import { stringify as yamlStringify } from 'yaml'
import { getCliContext } from '../../context'
import {
  CliError,
  NoProjectStateCliError,
  withErrorHandling,
} from '../../errors'
import { getProjectState } from '../../lib/project-state'

export const fobCommand = new Command('fob')
  .description(
    'Create an operation, optionally post a first log, and print the new op as YAML',
  )
  .requiredOption('-T, --title <title>', 'Operation title')
  .option(
    '-C, --content <content>',
    'First log content posted to the new operation',
  )
  .action(
    withErrorHandling(async (options: { title: string; content?: string }) => {
      const title = options.title.trim()
      if (title.length === 0) {
        throw new CliError('`-T` title must not be empty.')
      }

      const cliContext = getCliContext()
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }
      const projectSlug = projectState.config.projectSlug
      const { client } = cliContext

      const operation = await client.createOperation(projectSlug, { title })

      const content = options.content?.trim() ?? ''
      if (content.length > 0) {
        await client.createOperationLog(projectSlug, operation.number, {
          content,
        })
      }

      const url = `${client.baseUrl}/app/projects/${projectSlug}/operations/${operation.number}`
      process.stdout.write(
        yamlStringify({
          opNumber: operation.number,
          title: operation.title,
          url,
        }),
      )
    }),
  )
