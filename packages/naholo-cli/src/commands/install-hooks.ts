import { Command } from 'commander'
import { NoProjectStateCliError, withErrorHandling } from '../errors.js'
import {
  getProjectClaudeSettingsPath,
  installNaholoHooks,
  uninstallGlobalNaholoHooks,
} from '../lib/claude-settings.js'
import { getProjectState } from '../lib/project-state.js'

export const installHooksCommand = new Command('install-hooks')
  .description(
    'Install the Naholo Claude Code Stop hook into the current project (.claude/settings.json for fullcontrol, .claude/settings.local.json for covert) and prune any leftover global entry',
  )
  .action(
    withErrorHandling(async () => {
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }
      const settingsPath = getProjectClaudeSettingsPath(projectState)
      const result = installNaholoHooks(settingsPath)
      console.log(
        result === 'added'
          ? `Naholo hooks installed in ${settingsPath}`
          : `Naholo hooks already present in ${settingsPath}`,
      )
      const removedGlobal = uninstallGlobalNaholoHooks()
      if (removedGlobal) {
        console.log(
          'Removed leftover global Naholo hook entry from ~/.claude/settings.json.',
        )
      }
    }),
  )
