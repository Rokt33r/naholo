import select from '@inquirer/select'
import { Command } from 'commander'
import { setCovertProjectConfigUploadMode } from '../covert-config.js'
import { NoProjectStateCliError, withErrorHandling } from '../errors.js'
import {
  getProjectClaudeSettingsPath,
  installNaholoHooks,
  uninstallNaholoHooks,
} from '../lib/claude-settings.js'
import { getProjectState } from '../lib/project-state.js'
import {
  setProjectConfigUploadMode,
  type UploadTranscriptsOnExfil,
} from '../project-config.js'

export const projectConfigCommand = new Command('project-config')
  .description("View and edit the current project's config interactively")
  .action(
    withErrorHandling(async () => {
      while (true) {
        const projectState = getProjectState()
        if (projectState == null) {
          throw new NoProjectStateCliError()
        }
        const currentMode =
          projectState.config.uploadTranscriptsOnExfil ?? 'none'

        const selection = await select<'uploadTranscriptsOnExfil' | 'exit'>({
          message: 'Project config',
          choices: [
            {
              name: `uploadTranscriptsOnExfil: ${currentMode}`,
              value: 'uploadTranscriptsOnExfil',
            },
            { name: '(Exit)', value: 'exit' },
          ],
        })

        if (selection === 'exit') {
          return
        }

        const newMode = await select<UploadTranscriptsOnExfil | 'cancel'>({
          message: 'uploadTranscriptsOnExfil',
          default: currentMode,
          choices: [
            { name: 'No', value: 'none' },
            { name: 'Redacted (stats only)', value: 'redacted' },
            { name: 'Full', value: 'full' },
            { name: '(Cancel)', value: 'cancel' },
          ],
        })

        if (newMode === 'cancel') {
          continue
        }

        if (projectState.kind === 'covert') {
          setCovertProjectConfigUploadMode(projectState.root, newMode)
        } else {
          setProjectConfigUploadMode(projectState.root, newMode)
        }

        const settingsPath = getProjectClaudeSettingsPath(projectState)
        if (newMode === 'none') {
          const removed = uninstallNaholoHooks(settingsPath)
          if (removed) {
            console.log(`Removed Naholo hook from ${settingsPath}`)
          }
        } else {
          installNaholoHooks(settingsPath)
          console.log(`Naholo hooks installed in ${settingsPath}`)
        }
        return
      }
    }),
  )
