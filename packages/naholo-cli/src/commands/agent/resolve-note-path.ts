import path from 'node:path'
import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import { getNotesDir } from '../../lib/local-operations.js'

export const resolveNotePathCommand = new Command('resolve-note-path')
  .description('Print absolute path to a note file for an operation')
  .argument('<operationNumber>', 'Operation number')
  .argument('<noteName>', 'Note name (with or without .md extension)')
  .action(
    withErrorHandling(async (operationNumber: string, noteName: string) => {
      const filename = noteName.endsWith('.md') ? noteName : `${noteName}.md`
      const fullPath = path.join(getNotesDir(operationNumber), filename)
      console.log(fullPath)
    }),
  )
