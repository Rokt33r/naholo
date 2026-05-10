import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import { readOpYml } from '../../lib/local-operations.js'

export const opListCommand = new Command('op-list')
  .description('List local operations for the current project')
  .action(
    withErrorHandling(async () => {
      const opYml = readOpYml()
      if (opYml == null) {
        return
      }
      console.log(`#${opYml.number} ${opYml.title}`)
    }),
  )
