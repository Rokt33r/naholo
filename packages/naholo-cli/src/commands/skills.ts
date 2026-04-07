import { Command } from 'commander'
import { syncCommand } from './skills-sync.js'
import { pullCommand } from './skills-pull.js'
import { pushCommand } from './skills-push.js'
import { getCommand } from './skills-get.js'

export const skillsCommand = new Command('skills').description(
  'Manage naholo skills',
)

skillsCommand.addCommand(syncCommand)
skillsCommand.addCommand(pullCommand)
skillsCommand.addCommand(pushCommand)
skillsCommand.addCommand(getCommand)
