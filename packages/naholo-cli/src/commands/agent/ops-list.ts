import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import { getOperationsRootDir } from '../../lib/local-operations.js'

export const opsListCommand = new Command('list')
  .description('List local operations for the current project')
  .action(
    withErrorHandling(async () => {
      const root = getOperationsRootDir()
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
        const operationDir = path.join(root, opNum)
        const title = readOperationTitle(operationDir, opNum)
        console.log(`#${opNum}\t${title}\t${operationDir}`)
      }
    }),
  )

export const opsCommand = new Command('ops').description(
  'Commands for local operations',
)

opsCommand.addCommand(opsListCommand)

function readOperationTitle(operationDir: string, opNum: string): string {
  const operationMdPath = path.join(operationDir, 'notes', 'OPERATION.md')
  if (!fs.existsSync(operationMdPath)) {
    return ''
  }
  const content = fs.readFileSync(operationMdPath, 'utf-8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (line === '') {
      continue
    }
    if (line.startsWith('#')) {
      const headingBody = line.replace(/^#+\s*/, '')
      const prefix = `OP #${opNum}:`
      if (headingBody.startsWith(prefix)) {
        return headingBody.slice(prefix.length).trim()
      }
      return headingBody
    }
    return ''
  }
  return ''
}
