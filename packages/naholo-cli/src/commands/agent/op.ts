import { Command } from 'commander'
import {
  NoInfiledOpCliError,
  NoProjectStateCliError,
  withErrorHandling,
} from '../../errors.js'
import { getProjectState } from '../../lib/project-state.js'

export const opCommand = new Command('op')
  .description('Print the infiled operation status as YAML')
  .action(
    withErrorHandling(async () => {
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }
      const yaml = projectState.renderOpStatusYaml()
      if (yaml == null) {
        throw new NoInfiledOpCliError()
      }
      process.stdout.write(yaml)
    }),
  )
