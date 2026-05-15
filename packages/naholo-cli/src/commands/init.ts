import os from 'node:os'
import path from 'node:path'
import confirm from '@inquirer/confirm'
import select from '@inquirer/select'
import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import type { ProjectWithOperator } from 'naholo-api/types'
import { coreSkills } from '../core-skills.js'
import { CliError, withErrorHandling } from '../errors.js'
import {
  installSessionEndHook,
  installStopHook,
} from '../lib/claude-settings.js'
import { getActiveProfile } from '../profile.js'
import { writeProjectConfig, writeGitignore } from '../project-config.js'
import { installSkills } from './skills-install.js'

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

      // 3. Write .naholo/config.yml
      writeProjectConfig({
        projectId: selectedProject.id,
        projectSlug: selectedProject.slug,
      })

      // 4. Write .naholo/.gitignore
      writeGitignore()

      // 5. Install Claude Code Stop hook in the user-global settings file
      //    (always global so a project that uses both `naholo init` and
      //    `naholo covert init` doesn't end up firing the hook twice).
      const settingsPath = path.join(os.homedir(), '.claude', 'settings.json')
      const stopHookResult = installStopHook(settingsPath)
      const sessionEndHookResult = installSessionEndHook(settingsPath)

      console.log()
      console.log(`Project initialized: ${selectedProject.name}`)
      console.log(
        stopHookResult === 'added'
          ? `Stop hook installed in ${settingsPath}`
          : `Stop hook already present in ${settingsPath}`,
      )
      console.log(
        sessionEndHookResult === 'added'
          ? `SessionEnd hook installed in ${settingsPath}`
          : `SessionEnd hook already present in ${settingsPath}`,
      )
      console.log()

      // 6. Prompt to install core skills
      const installCore = await confirm({
        message: 'Install core skills?',
        default: true,
      })
      if (installCore) {
        await installSkills(coreSkills)
      }
    }),
  )
