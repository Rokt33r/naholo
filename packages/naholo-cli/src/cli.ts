#!/usr/bin/env node

import { Command } from 'commander'
import { loginCommand } from './commands/login.js'
import { logoutCommand } from './commands/logout.js'
import { whoamiCommand } from './commands/whoami.js'

const program = new Command()

program
  .name('naholo')
  .description('CLI for Naholo — task/issue management')
  .version('0.1.0')
  .option('--profile <name>', 'use a specific profile instead of default')

program.addCommand(loginCommand)
program.addCommand(logoutCommand)
program.addCommand(whoamiCommand)

program.parse()
