import confirm from '@inquirer/confirm'
import select from '@inquirer/select'
import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import type { ProjectWithOperator } from 'naholo-api/types'
import { CliError, withErrorHandling } from '../errors.js'
import {
  addNaholoPermissionsToClaudeSettings,
  addNaholoStopHookToClaudeSettings,
  getProjectClaudeSettingsPath,
  readClaudeSettings,
  removeNaholoStopHookFromClaudeSettings,
  writeClaudeSettings,
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

      // 6. Configure the Claude Code settings file in a single read/write
      const projectState = getProjectState(process.cwd())
      if (projectState != null) {
        const settingsPath = getProjectClaudeSettingsPath(projectState)
        let settings = readClaudeSettings(settingsPath)
        settings =
          uploadTranscriptsOnExfil === 'none'
            ? removeNaholoStopHookFromClaudeSettings(settings)
            : addNaholoStopHookToClaudeSettings(settings)
        settings = addNaholoPermissionsToClaudeSettings(settings)
        writeClaudeSettings(settingsPath, settings)
        console.log(`Naholo Claude settings configured in ${settingsPath}`)
      }

      writeProjectMcpJson(projectState?.root ?? process.cwd())
      console.log('Naholo MCP server registered in .mcp.json')

      // 7. Point the user at the plugin for the core skills
      console.log()
      console.log(
        "Run the commands below in your terminal to install naholo's core skills:",
      )
      console.log()
      console.log(
        '  claude plugin marketplace add rokt33r/naholo-claude-plugin',
      )
      console.log('  claude plugin install naholo-claude-plugin@naholo')
    }),
  )
