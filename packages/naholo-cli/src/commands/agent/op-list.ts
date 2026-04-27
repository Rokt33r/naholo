import fs from 'node:fs'
import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import { getLocalOperationsRootDir } from '../../lib/local-operations.js'

export const opListCommand = new Command('op-list')
  .description('List local operations for the current project')
  .action(
    withErrorHandling(async () => {
      const root = getLocalOperationsRootDir()
      if (!fs.existsSync(root)) {
        return
      }

      const entries = fs
        .readdirSync(root, { withFileTypes: true })
        .flatMap((entry) =>
          entry.isDirectory() && /^\d+$/.test(entry.name) ? [entry.name] : [],
        )
        .sort((a, b) => Number(a) - Number(b))

      for (const opNum of entries) {
        console.log(opNum)
      }
    }),
  )
