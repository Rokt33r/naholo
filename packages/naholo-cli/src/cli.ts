#!/usr/bin/env node

import { Command } from 'commander'
import updateNotifier from 'update-notifier'
import pkg from '../package.json'
import { initCommand } from './commands/init.js'
import { installHooksCommand } from './commands/install-hooks.js'
import { installSkillsCommand } from './commands/install-skills.js'
import { loginCommand } from './commands/login.js'
import { mcpCommand } from './commands/mcp.js'
import { projectConfigCommand } from './commands/project-config.js'
import { agentCommand } from './commands/agent/index.js'
import { configCommand } from './commands/config/index.js'
import { covertCommand } from './commands/covert.js'
import { devCommand } from './commands/dev/index.js'
import { logoutCommand } from './commands/logout.js'

import { statusCommand } from './commands/status.js'
import { whoamiCommand } from './commands/whoami.js'
import { version } from './version.js'

const program = new Command()

program
  .name('naholo')
  .description('CLI for Naholo — task/issue management')
  .version(version)

program.addCommand(initCommand)
program.addCommand(installHooksCommand)
program.addCommand(installSkillsCommand)
program.addCommand(loginCommand)
program.addCommand(logoutCommand)
program.addCommand(mcpCommand)
program.addCommand(projectConfigCommand)
program.addCommand(agentCommand)
program.addCommand(configCommand)
program.addCommand(covertCommand)
program.addCommand(devCommand)
program.addCommand(statusCommand)
program.addCommand(whoamiCommand)

updateNotifier({ pkg }).notify({ defer: true })

program.parse()
