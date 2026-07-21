import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Command } from 'commander'
import { NoProjectStateCliError, withErrorHandling } from '../errors'
import {
  addNaholoStopHookToClaudeSettings,
  getProjectClaudeSettingsPath,
  hasNaholoStopHook,
  readClaudeSettings,
  removeNaholoStopHookFromClaudeSettings,
  writeClaudeSettings,
} from '../lib/claude-settings'
import { getProjectState } from '../lib/project-state'

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

export function installNaholoHooks(
  settingsPath: string,
): 'added' | 'already-present' {
  const settings = readClaudeSettings(settingsPath)
  if (hasNaholoStopHook(settings)) {
    return 'already-present'
  }
  writeClaudeSettings(settingsPath, addNaholoStopHookToClaudeSettings(settings))
  return 'added'
}

export function uninstallNaholoHooks(settingsPath: string): boolean {
  if (!fs.existsSync(settingsPath)) {
    return false
  }
  const settings = readClaudeSettings(settingsPath)
  if (!hasNaholoStopHook(settings)) {
    return false
  }
  writeClaudeSettings(
    settingsPath,
    removeNaholoStopHookFromClaudeSettings(settings),
  )
  return true
}

export function uninstallGlobalNaholoHooks(): boolean {
  return uninstallNaholoHooks(
    path.join(os.homedir(), '.claude', 'settings.json'),
  )
}
