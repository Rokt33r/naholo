#!/usr/bin/env node

import { Command } from 'commander'
import updateNotifier from 'update-notifier'
import pkg from '../package.json'
import { initCommand } from './commands/init'
import { installHooksCommand } from './commands/install-hooks'
import { loginCommand } from './commands/login'
import { mcpCommand } from './commands/mcp'
import { projectConfigCommand } from './commands/project-config'
import { agentCommand } from './commands/agent/index'
import { configCommand } from './commands/config/index'
import { covertCommand } from './commands/covert/index'
import { devCommand } from './commands/dev/index'
import { doctorCommand } from './commands/doctor'
import { logoutCommand } from './commands/logout'

import { statusCommand } from './commands/status'
import { whoamiCommand } from './commands/whoami'
import { version } from './version'

const program = new Command()

program
  .name('naholo')
  .description('CLI for Naholo — task/issue management')
  .version(version)

program.addCommand(initCommand)
program.addCommand(installHooksCommand)
program.addCommand(loginCommand)
program.addCommand(logoutCommand)
program.addCommand(mcpCommand)
program.addCommand(projectConfigCommand)
program.addCommand(agentCommand)
program.addCommand(configCommand)
program.addCommand(covertCommand)
program.addCommand(devCommand)
program.addCommand(doctorCommand)
program.addCommand(statusCommand)
program.addCommand(whoamiCommand)

updateNotifier({ pkg }).notify({ defer: true })

program.parse()
