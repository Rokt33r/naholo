import os from 'node:os'
import path from 'node:path'
import { Command } from 'commander'
import { withErrorHandling } from '../errors.js'
import { installNaholoHooks } from '../lib/claude-settings.js'

export const installHooksCommand = new Command('install-hooks')
  .description(
    'Install the Naholo Claude Code hooks (Stop + SessionEnd) into ~/.claude/settings.json without re-running login',
  )
  .action(
    withErrorHandling(async () => {
      const settingsPath = path.join(os.homedir(), '.claude', 'settings.json')
      const result = installNaholoHooks(settingsPath)
      console.log(
        result === 'added'
          ? `Naholo hooks installed in ${settingsPath}`
          : `Naholo hooks already present in ${settingsPath}`,
      )
    }),
  )
