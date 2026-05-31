import { Command } from 'commander'
import { withErrorHandling } from '../../errors.js'
import { pushOp } from '../../lib/push-op.js'

export const pushCommand = new Command('push')
  .description('Push the infiled operation to the server')
  .action(
    withErrorHandling(async () => {
      const result = await pushOp()
      console.log(`Pushed operation #${result.opNum}`)
      console.log(
        `  Tasks: ${result.tasksSynced} synced, ${result.createdTasks.length} created`,
      )
      if (result.createdTasks.length > 0) {
        for (const c of result.createdTasks) {
          console.log(`    + ${c.name} (${c.id})`)
        }
      }
      console.log(
        `  Notes: ${result.updatedNotes.length} updated, ${result.createdNotes.length} created`,
      )
      if (result.updatedNotes.length > 0) {
        console.log(`    Updated: ${result.updatedNotes.join(', ')}`)
      }
      if (result.createdNotes.length > 0) {
        console.log(`    Created: ${result.createdNotes.join(', ')}`)
      }
      console.log(`  Local: ${result.localDir}/`)
    }),
  )
