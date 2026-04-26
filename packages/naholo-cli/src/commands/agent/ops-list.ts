import fs from 'node:fs'
import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import {
  getLocalOperationsRootDir,
  getLocalOperationDir,
} from '../../lib/local-operations.js'

export const opsListCommand = new Command('list')
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

export const opsPathCommand = new Command('path')
  .description('Print the absolute local directory for an operation')
  .argument('<operationNumber>', 'Operation number')
  .action(
    withErrorHandling(async (operationNumber: string) => {
      console.log(getLocalOperationDir(operationNumber))
    }),
  )

export const opsCommand = new Command('ops').description(
  'Commands for local operations',
)

opsCommand.addCommand(opsListCommand)
opsCommand.addCommand(opsPathCommand)
