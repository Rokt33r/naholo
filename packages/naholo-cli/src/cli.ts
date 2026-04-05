#!/usr/bin/env node

import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { loginCommand } from './commands/login.js'
import { logoutCommand } from './commands/logout.js'
import { skillsCommand } from './commands/skills.js'
import { statusCommand } from './commands/status.js'
import { whoamiCommand } from './commands/whoami.js'

const program = new Command()

program
  .name('naholo')
  .description('CLI for Naholo — task/issue management')
  .version('0.1.0')

program.addCommand(initCommand)
program.addCommand(loginCommand)
program.addCommand(logoutCommand)
program.addCommand(skillsCommand)
program.addCommand(statusCommand)
program.addCommand(whoamiCommand)

program.parse()
