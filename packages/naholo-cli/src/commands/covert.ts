import os from 'node:os'
import path from 'node:path'
import checkbox from '@inquirer/checkbox'
import confirm from '@inquirer/confirm'
import select from '@inquirer/select'
import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import type { ProjectWithOperator } from 'naholo-api/types'
import { coreSkills } from '../core-skills.js'
import { CliError, withErrorHandling } from '../errors.js'
import { getActiveProfile } from '../profile.js'
import {
  collectExistingCodeNames,
  getCovertOpsConfigPath,
  getCovertOpsDir,
  readCovertOpsConfig,
  removeCovertOpsProjectConfig,
  writeCovertOpsConfig,
} from '../covert-config.js'
import { installStopHook } from '../lib/claude-settings.js'
import { generateCodeName } from '../lib/codename.js'
import { installSkills } from './skills-install.js'

export const covertCommand = new Command('covert').description(
  'Manage covert mode for projects without repo config',
)

// TODO: Split covert commands
covertCommand
  .command('init')
  .description('Register the current directory for covert mode')
  .option('--profile <name>', 'use a specific profile instead of default')
  .action(
    withErrorHandling(async (options: Record<string, string>) => {
      const profileOverride =
        typeof options.profile !== 'string' ? options.profile : undefined

      const active = getActiveProfile(profileOverride)
      if (active == null) {
        throw new CliError('Not logged in. Run "naholo login" to authenticate.')
      }

      const { profile } = active
      const client = new NaholoClient({
        baseUrl: profile.baseUrl,
        token: profile.token,
      })

      // 1. Fetch projects linked to the user
      const projects = await client.listProjects({
        with: 'projectOperatorOfCurrentUser',
      })
      if (projects.length === 0) {
        throw new CliError('No projects found for your account.')
      }

      // 2. Prompt user to select a project
      const selectedProject = await select<ProjectWithOperator>({
        message: 'Select a project',
        choices: projects.map((p) => ({
          name: p.name,
          value: p,
        })),
      })

      // 3. Fetch operators and filter to bot operators only
      const operators = await client.listOperators(selectedProject.slug)
      const botOperators = operators.filter((w) => w.type === 'bot')

      if (botOperators.length === 0) {
        throw new CliError(
          'No bot operators found for this project. Create one via the web UI first.',
        )
      }

      const selectedBotOperatorId = await select<string>({
        message: 'Select a bot operator',
        choices: botOperators.map((w) => ({
          name: w.name,
          value: w.id,
        })),
      })

      const selectedBotOperator = botOperators.find(
        (w) => w.id === selectedBotOperatorId,
      )!

      // 4. Write covert config
      const cwd = process.cwd()
      const config = readCovertOpsConfig()
      const codeName = generateCodeName(collectExistingCodeNames(config))
      config.projects[cwd] = {
        projectId: selectedProject.id,
        projectSlug: selectedProject.slug,
        projectOperatorId: selectedBotOperatorId,
        codeName,
      }
      writeCovertOpsConfig(config)

      const covertOpsRoot = path.join(getCovertOpsDir(), codeName)

      // Install Claude Code Stop hook in the user-global settings file
      const userSettingsPath = path.join(
        os.homedir(),
        '.claude',
        'settings.json',
      )
      const hookResult = installStopHook(userSettingsPath)

      console.log()
      console.log(`Covert mode registered for: ${cwd}`)
      console.log(`  Project:  ${selectedProject.name}`)
      console.log(`  Operator: ${selectedBotOperator.name} (bot)`)
      console.log(`  Codename: ${codeName}`)
      console.log(`  Project dir:  ${covertOpsRoot}`)
      console.log()
      console.log(`Config stored in ${getCovertOpsConfigPath()}`)
      console.log(
        hookResult === 'added'
          ? `Stop hook installed in ${userSettingsPath}`
          : `Stop hook already present in ${userSettingsPath}`,
      )
      console.log('No files written to the project repo.')
      console.log()

      // Prompt to install core skill loadout
      const installCore = await confirm({
        message: 'Install core skill loadout?',
        default: true,
      })
      if (installCore) {
        await installSkills(coreSkills)
      }
    }),
  )

covertCommand
  .command('exit')
  .description('Remove covert mode registration for a project path')
  .argument('[path]', 'project path to deregister (defaults to current dir)')
  .option('-i, --interactive', 'skip path lookup, select from registered paths')
  .option(
    '-b, --bail',
    'strict mode: error if path not found (no interactive fallback)',
  )
  .action(
    withErrorHandling(
      async (
        pathArg: string | undefined,
        options: { interactive?: boolean; bail?: boolean },
      ) => {
        // Interactive mode: skip path lookup entirely
        if (options.interactive === true) {
          await interactiveRemove()
          return
        }

        const resolvedPath = path.resolve(pathArg ?? process.cwd())
        const removed = removeCovertOpsProjectConfig(resolvedPath)

        if (removed) {
          console.log(`Covert mode removed for: ${resolvedPath}`)
          return
        }

        // Path not found
        if (options.bail === true) {
          throw new CliError(`No covert mode config found for: ${resolvedPath}`)
        }

        // Default: fall through to interactive
        console.log(`No covert mode config found for: ${resolvedPath}`)
        console.log()
        await interactiveRemove()
      },
    ),
  )

async function interactiveRemove(): Promise<void> {
  const config = readCovertOpsConfig()
  const paths = Object.keys(config.projects)

  if (paths.length === 0) {
    console.log('No covert mode projects registered.')
    return
  }

  const selected = await checkbox<string>({
    message: 'Select paths to remove from covert mode',
    choices: paths.map((p) => ({
      name: p,
      value: p,
    })),
  })

  if (selected.length === 0) {
    console.log('No paths selected.')
    return
  }

  for (const p of selected) {
    removeCovertOpsProjectConfig(p)
    console.log(`Covert mode removed for: ${p}`)
  }
}
