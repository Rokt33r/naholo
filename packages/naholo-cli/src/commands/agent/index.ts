import { Command } from 'commander'
import { manCommand } from './man.js'
import { opListCommand } from './op-list.js'
import { opPathCommand } from './op-path.js'
import { opUrlCommand } from './op-url.js'
import { pullCommand } from './pull.js'
import { pushCommand } from './push.js'

export const agentCommand = new Command('agent').description(
  'Commands for AI agent workflows',
)

agentCommand.addCommand(pullCommand)
agentCommand.addCommand(pushCommand)
agentCommand.addCommand(manCommand)
agentCommand.addCommand(opListCommand)
agentCommand.addCommand(opPathCommand)
agentCommand.addCommand(opUrlCommand)
