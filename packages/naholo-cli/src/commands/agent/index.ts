import { Command } from 'commander'
import { addTimelineCommand } from './add-timeline.js'
import { infilCommand } from './infil.js'
import { manCommand } from './man.js'
import { opCommand } from './op.js'
import { opPathCommand } from './op-path.js'
import { opUrlCommand } from './op-url.js'
import { pullCommand } from './pull.js'
import { pushCommand } from './push.js'
import { claudeCodeStopCommand } from './claude-code-stop.js'

export const agentCommand = new Command('agent').description(
  'Commands for AI agent workflows',
)

agentCommand.addCommand(infilCommand)
agentCommand.addCommand(pullCommand)
agentCommand.addCommand(pushCommand)
agentCommand.addCommand(addTimelineCommand)
agentCommand.addCommand(manCommand)
agentCommand.addCommand(opCommand)
agentCommand.addCommand(opPathCommand)
agentCommand.addCommand(opUrlCommand)
agentCommand.addCommand(claudeCodeStopCommand)
