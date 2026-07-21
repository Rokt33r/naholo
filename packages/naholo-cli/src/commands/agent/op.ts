import { Command } from 'commander'
import {
  NoInfilledOpCliError,
  NoProjectStateCliError,
  withErrorHandling,
} from '../../errors'
import { getProjectState } from '../../lib/project-state'

export const opCommand = new Command('op')
  .description('Print the infilled operation status as YAML')
  .action(
    withErrorHandling(async () => {
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }
      const yaml = projectState.renderOpStatusYaml()
      if (yaml == null) {
        throw new NoInfilledOpCliError()
      }
      process.stdout.write(yaml)
    }),
  )
