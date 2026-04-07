import { Command } from 'commander'
import { getCliContext } from '../context.js'
import { syncSkills } from '../skills.js'

export const syncCommand = new Command('sync')
  .description('Sync skill stubs from the server')
  .action(async () => {
    const ctx = getCliContext()

    await syncSkills(ctx.client, ctx.projectConfig.projectId)
  })
