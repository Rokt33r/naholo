import { Command } from 'commander'
import { infilCommand } from './infil.js'
import { manCommand } from './man.js'
import { opCommand } from './op.js'
import { opPathCommand } from './op-path.js'
import { opUrlCommand } from './op-url.js'
import { pullCommand } from './pull.js'
import { pushCommand } from './push.js'
import { statsRecordCommand } from './stats-record.js'

export const agentCommand = new Command('agent').description(
  'Commands for AI agent workflows',
)

agentCommand.addCommand(infilCommand)
agentCommand.addCommand(pullCommand)
agentCommand.addCommand(pushCommand)
agentCommand.addCommand(manCommand)
agentCommand.addCommand(opCommand)
agentCommand.addCommand(opPathCommand)
agentCommand.addCommand(opUrlCommand)
agentCommand.addCommand(statsRecordCommand)
