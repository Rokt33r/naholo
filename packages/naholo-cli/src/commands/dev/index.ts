import { Command } from 'commander'
import { dumpOpCommand } from './dump-op'

export const devCommand = new Command('dev').description(
  'Internal dev tooling (not for end users)',
)

devCommand.addCommand(dumpOpCommand)
