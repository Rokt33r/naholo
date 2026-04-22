import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import manualText from './manual.md'

export const manCommand = new Command('man')
  .description('Print Naholo agent workflow manual')
  .action(
    withErrorHandling(async () => {
      console.log(manualText)
    }),
  )
