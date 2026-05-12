import { Command } from 'commander'
import { installCommand } from './skills-install.js'

export const skillsCommand = new Command('skills').description(
  'Manage naholo skills',
)

skillsCommand.addCommand(installCommand)
