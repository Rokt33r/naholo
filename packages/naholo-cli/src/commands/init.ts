import confirm from '@inquirer/confirm'
import select from '@inquirer/select'
import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import type { ProjectWithOperator } from 'naholo-api/types'
import { coreSkills } from '../core-skills.js'
import { CliError, withErrorHandling } from '../errors.js'
import {
  addNaholoPermissions,
  getProjectClaudeSettingsPath,
  installNaholoHooks,
  uninstallNaholoHooks,
} from '../lib/claude-settings.js'
import { writeProjectMcpJson } from '../lib/mcp-json.js'
import { getProjectState } from '../lib/project-state.js'
import { getActiveProfile } from '../profile.js'
import {
  writeProjectConfigInCwdNaholoDir,
  writeGitignoreInCwdNaholoDir,
  type ProjectConfig,
  type UploadTranscriptsOnExfil,
} from '../project-config.js'
import { installSkills } from './install-skills.js'

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

      // Warn when cwd is already a naholo project or sits inside one.
      const existing = getProjectState(process.cwd())
      if (existing != null) {
        console.log()
        console.log(
          `A naholo ${existing.kind} project is already configured at: ${existing.root}`,
        )
        console.log(`You are initializing at: ${process.cwd()}`)
        const proceed = await confirm({
          message: 'Initialize anyway?',
          default: false,
        })
        if (!proceed) {
          return
        }
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

      // 3. Prompt for transcript upload mode
      const uploadTranscriptsOnExfil = await select<UploadTranscriptsOnExfil>({
        message:
          'Send agent-session transcripts to the Naholo server on exfil?',
        default: 'none',
        choices: [
          { name: 'No', value: 'none' },
          { name: 'Redacted (stats only)', value: 'redacted' },
          { name: 'Full', value: 'full' },
        ],
      })

      // 4. Write .naholo/config.yml with the chosen upload mode (including 'none')
      const projectConfig: ProjectConfig = {
        projectId: selectedProject.id,
        projectSlug: selectedProject.slug,
        uploadTranscriptsOnExfil,
      }
      writeProjectConfigInCwdNaholoDir(projectConfig)

      // 5. Write .naholo/.gitignore
      writeGitignoreInCwdNaholoDir()

      console.log()
      console.log(`Project initialized: ${selectedProject.name}`)
      console.log()

      // 6. Install or uninstall the Claude Code Stop hook based on the chosen upload mode
      const projectState = getProjectState(process.cwd())
      if (projectState != null) {
        const settingsPath = getProjectClaudeSettingsPath(projectState)
        if (uploadTranscriptsOnExfil === 'none') {
          const removed = uninstallNaholoHooks(settingsPath)
          if (removed) {
            console.log(`Removed Naholo hook from ${settingsPath}`)
          }
        } else {
          installNaholoHooks(settingsPath)
          console.log(`Naholo hooks installed in ${settingsPath}`)
        }

        addNaholoPermissions(settingsPath)
        console.log(`Naholo permissions granted in ${settingsPath}`)
      }

      writeProjectMcpJson(projectState?.root ?? process.cwd())
      console.log('Naholo MCP server registered in .mcp.json')

      // 7. Prompt to install core skills
      const installCore = await confirm({
        message: 'Install core skills?',
        default: true,
      })
      if (installCore) {
        await installSkills(coreSkills)
      }
    }),
  )
