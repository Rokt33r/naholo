import { Command } from 'commander'
import { manCommand } from './man.js'
import { opsCommand } from './ops-list.js'
import { pullCommand } from './pull.js'
import { pushCommand } from './push.js'

export const agentCommand = new Command('agent').description(
  'Commands for AI agent workflows',
)

agentCommand.addCommand(pullCommand)
agentCommand.addCommand(pushCommand)
agentCommand.addCommand(manCommand)
agentCommand.addCommand(opsCommand)
