import { Command } from 'commander'
import { dumpOpCommand } from './dump-op.js'

export const devCommand = new Command('dev').description(
  'Internal dev tooling (not for end users)',
)

devCommand.addCommand(dumpOpCommand)
