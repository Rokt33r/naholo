import path from 'node:path'
import checkbox from '@inquirer/checkbox'
import select from '@inquirer/select'
import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import type { ProjectWithOperator } from 'naholo-api/types'
import { CliError, withErrorHandling } from '../errors.js'
import { getActiveProfile } from '../profile.js'
import {
  readCovertConfig,
  removeCovertProjectConfig,
  writeCovertConfig,
} from '../covert-config.js'

export const covertCommand = new Command('covert').description(
  'Manage covert mode for projects without repo config',
)

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
      const config = readCovertConfig()
      config.projects[cwd] = {
        projectId: selectedProject.id,
        projectSlug: selectedProject.slug,
        projectOperatorId: selectedBotOperatorId,
      }
      writeCovertConfig(config)

      console.log()
      console.log(`Covert mode registered for: ${cwd}`)
      console.log(`  Project:  ${selectedProject.name}`)
      console.log(`  Operator: ${selectedBotOperator.name} (bot)`)
      console.log()
      console.log('Config stored in ~/.naholo/covert-mode-config.yml')
      console.log('No files written to the project repo.')
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
        const removed = removeCovertProjectConfig(resolvedPath)

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
  const config = readCovertConfig()
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
    removeCovertProjectConfig(p)
    console.log(`Covert mode removed for: ${p}`)
  }
}
