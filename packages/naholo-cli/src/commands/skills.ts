import { Command } from 'commander'
import { syncAliasCommand } from './skills-sync-alias.js'
import { pullCommand } from './skills-pull.js'
import { pushCommand } from './skills-push.js'
import { getCommand } from './skills-get.js'

export const skillsCommand = new Command('skills').description(
  'Manage naholo skills',
)

skillsCommand.addCommand(syncAliasCommand)
skillsCommand.addCommand(pullCommand)
skillsCommand.addCommand(pushCommand)
skillsCommand.addCommand(getCommand)
