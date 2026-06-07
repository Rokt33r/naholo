import { Command } from 'commander'
import { CliError, withErrorHandling } from '../../errors.js'
import { renderOpStatusYaml } from '../../lib/local-operations.js'

export const opCommand = new Command('op')
  .description('Print the infiled operation status as YAML')
  .action(
    withErrorHandling(async () => {
      const yaml = renderOpStatusYaml()
      if (yaml == null) {
        throw new CliError('No infiled operation.')
      }
      process.stdout.write(yaml)
    }),
  )
