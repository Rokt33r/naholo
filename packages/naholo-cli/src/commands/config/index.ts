import { Command } from 'commander'
import { localeCommand } from './locale'
import { soulCommand } from './soul'

export const configCommand = new Command('config').description(
  'Configure the active naholo profile',
)

configCommand.addCommand(soulCommand)
configCommand.addCommand(localeCommand)
