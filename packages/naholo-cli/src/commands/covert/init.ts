import path from 'node:path'
import confirm from '@inquirer/confirm'
import select from '@inquirer/select'
import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import type { ProjectWithOperator } from 'naholo-api/types'
import { registerNaholoMcpForProject } from '../../claude-code-config.js'
import { CliError, withErrorHandling } from '../../errors.js'
import {
  addNaholoCovertPermissionsToClaudeSettings,
  addNaholoStopHookToClaudeSettings,
  getProjectClaudeSettingsPath,
  readClaudeSettings,
  removeNaholoStopHookFromClaudeSettings,
  writeClaudeSettings,
} from '../../lib/claude-settings.js'
import { getActiveProfile } from '../../profile.js'
import {
  collectExistingCodeNames,
  getCovertOpsConfigPath,
  getCovertOpsDir,
  readCovertOpsConfig,
  writeCovertOpsConfig,
} from '../../covert-config.js'
import type { UploadTranscriptsOnExfil } from '../../project-config.js'
import { generateCodeName } from '../../lib/codename.js'
import { getProjectState } from '../../lib/project-state.js'

export const covertInitCommand = new Command('init')
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

      // 4. Write covert config with the chosen upload mode (including 'none')
      const cwd = process.cwd()
      const config = readCovertOpsConfig()
      const codeName = generateCodeName(collectExistingCodeNames(config))
      config.projects[cwd] = {
        projectId: selectedProject.id,
        projectSlug: selectedProject.slug,
        codeName,
        uploadTranscriptsOnExfil,
      }
      writeCovertOpsConfig(config)

      const covertOpsRoot = path.join(getCovertOpsDir(), codeName)

      console.log()
      console.log(`Covert mode registered for: ${cwd}`)
      console.log(`  Project:  ${selectedProject.name}`)
      console.log(`  Codename: ${codeName}`)
      console.log(`  Project dir:  ${covertOpsRoot}`)
      console.log()
      console.log(`Config stored in ${getCovertOpsConfigPath()}`)
      console.log('No files written to the project repo.')
      console.log()

      // 5. Configure the Claude Code settings file in a single read/write
      const projectState = getProjectState(process.cwd())
      if (projectState != null) {
        const claudeSettingsPath = getProjectClaudeSettingsPath(projectState)
        let settings = readClaudeSettings(claudeSettingsPath)
        settings =
          uploadTranscriptsOnExfil === 'none'
            ? removeNaholoStopHookFromClaudeSettings(settings)
            : addNaholoStopHookToClaudeSettings(settings)
        settings = addNaholoCovertPermissionsToClaudeSettings(
          settings,
          covertOpsRoot,
        )
        writeClaudeSettings(claudeSettingsPath, settings)
        console.log(
          `Naholo Claude settings configured in ${claudeSettingsPath}`,
        )
      }

      registerNaholoMcpForProject(cwd)
      console.log(
        'Naholo MCP server registered for this project in ~/.claude.json',
      )

      // Point the user at the plugin for the core skills
      console.log()
      console.log('Install the core skills via the Claude Code plugin:')
      console.log('  /plugin marketplace add rokt33r/naholo-claude-plugin')
    }),
  )
