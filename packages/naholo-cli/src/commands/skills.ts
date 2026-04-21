import { Command } from 'commander'
import { installCommand } from './skills-install.js'
import { upsertCommand } from './skills-upsert.js'
import { loadoutsCommand } from './skill-loadouts.js'

export const skillsCommand = new Command('skills').description(
  'Manage naholo skills',
)

skillsCommand.addCommand(installCommand)
skillsCommand.addCommand(upsertCommand)
skillsCommand.addCommand(loadoutsCommand)
