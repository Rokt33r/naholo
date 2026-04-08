#!/usr/bin/env node

import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { loginCommand } from './commands/login.js'
import { mcpCommand } from './commands/mcp.js'
import { logoutCommand } from './commands/logout.js'
import { skillsCommand } from './commands/skills.js'
import { statusCommand } from './commands/status.js'
import { whoamiCommand } from './commands/whoami.js'
import { version } from './version.js'

const program = new Command()

program
  .name('naholo')
  .description('CLI for Naholo — task/issue management')
  .version(version)

program.addCommand(initCommand)
program.addCommand(loginCommand)
program.addCommand(logoutCommand)
program.addCommand(mcpCommand)
program.addCommand(skillsCommand)
program.addCommand(statusCommand)
program.addCommand(whoamiCommand)

program.parse()
