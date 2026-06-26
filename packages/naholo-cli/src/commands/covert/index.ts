import { Command } from 'commander'
import { covertInitCommand } from './init.js'
import { covertExitCommand } from './exit.js'

export const covertCommand = new Command('covert').description(
  'Manage covert mode for projects without repo config',
)

covertCommand.addCommand(covertInitCommand)
covertCommand.addCommand(covertExitCommand)
