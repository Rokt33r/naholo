import { Command } from 'commander'
import { getCliContext } from '../context.js'
import { syncSkillAliases } from '../skills.js'

export const syncAliasCommand = new Command('sync-alias')
  .description('Sync skill aliases from the server')
  .action(async (_options: Record<string, unknown>, cmd: Command) => {
    const ctx = getCliContext()

    await syncSkillAliases(ctx.client, ctx.projectConfig.projectId)
  })
