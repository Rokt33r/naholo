import select from '@inquirer/select'
import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import type { ProjectWithWorker } from 'naholo-api/types'
import { CliError, withErrorHandling } from '../errors.js'
import { getActiveProfile } from '../profile.js'
import { writeProjectConfig, writeGitignore } from '../project-config.js'

export const initCommand = new Command('init')
  .description('Initialize Naholo project in the current directory')
  .option('--profile <name>', 'use a specific profile instead of default')
  .action(
    withErrorHandling(async (options: Record<string, string>, cmd: Command) => {
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
        with: 'projectWorkerOfCurrentUser',
      })
      if (projects.length === 0) {
        throw new CliError('No projects found for your account.')
      }

      // 2. Prompt user to select a project
      const selectedProject = await select<ProjectWithWorker>({
        message: 'Select a project',
        choices: projects.map((p) => ({
          name: p.name,
          value: p,
        })),
      })

      // 3. Fetch workers and filter to bot workers only for project-level config
      const workers = await client.listWorkers(selectedProject.slug)
      const botWorkers = workers.filter((w) => w.type === 'bot')

      if (botWorkers.length === 0) {
        throw new CliError(
          'No bot workers found for this project. Create one via the web UI first.',
        )
      }

      const selectedBotWorkerId = await select<string>({
        message: 'Select a bot worker for the project',
        choices: botWorkers.map((w) => ({
          name: w.name,
          value: w.id,
        })),
      })

      const selectedBotWorker = botWorkers.find(
        (w) => w.id === selectedBotWorkerId,
      )!

      // 4. Write .naholo/config.yml
      writeProjectConfig({
        projectId: selectedProject.id,
        projectSlug: selectedProject.slug,
        projectWorkerId: selectedBotWorkerId,
      })

      // 5. Write .naholo/.gitignore
      writeGitignore()

      console.log()
      console.log(`Project initialized: ${selectedProject.name}`)
      console.log(`Project worker: ${selectedBotWorker.name} (bot)`)
    }),
  )
