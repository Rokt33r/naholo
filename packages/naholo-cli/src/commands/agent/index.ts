import { Command } from 'commander'
import { addTimelineCommand } from './add-timeline'
import { bootCommand } from './boot'
import { chopchopCommand } from './chopchop'
import { exfilCommand } from './exfil'
import { fobCommand } from './fob'
import { infilCommand } from './infil'
import { manCommand } from './man'
import { opCommand } from './op'
import { reinfilCommand } from './reinfil'
import { sitrepCommand } from './sitrep'
import { skillsCommand } from './skills'
import { claudeCodeStopCommand } from './claude-code-stop'

export const agentCommand = new Command('agent').description(
  'Commands for AI agent workflows',
)

agentCommand.addCommand(infilCommand)
agentCommand.addCommand(reinfilCommand)
agentCommand.addCommand(fobCommand)
agentCommand.addCommand(exfilCommand)
agentCommand.addCommand(sitrepCommand)
agentCommand.addCommand(addTimelineCommand)
agentCommand.addCommand(bootCommand)
agentCommand.addCommand(manCommand)
agentCommand.addCommand(opCommand)
agentCommand.addCommand(claudeCodeStopCommand)
agentCommand.addCommand(chopchopCommand)
agentCommand.addCommand(skillsCommand)
