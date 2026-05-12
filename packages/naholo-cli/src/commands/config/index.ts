import { Command } from 'commander'
import { soulCommand } from './soul.js'

export const configCommand = new Command('config').description(
  'Configure the active naholo profile',
)

configCommand.addCommand(soulCommand)
