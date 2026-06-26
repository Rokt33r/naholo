import fs from 'node:fs'
import path from 'node:path'
import checkbox from '@inquirer/checkbox'
import { Command } from 'commander'
import { unregisterNaholoMcpForProject } from '../../claude-code-config.js'
import { CliError, withErrorHandling } from '../../errors.js'
import {
  readClaudeSettings,
  removeNaholoCovertPermissionsFromClaudeSettings,
  removeNaholoStopHookFromClaudeSettings,
  writeClaudeSettings,
} from '../../lib/claude-settings.js'
import {
  getCovertOpsDir,
  readCovertOpsConfig,
  removeCovertOpsProjectConfig,
} from '../../covert-config.js'

export const covertExitCommand = new Command('exit')
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
        const entry = readCovertOpsConfig().projects[resolvedPath]
        const removed = removeCovertOpsProjectConfig(resolvedPath)

        if (removed) {
          if (entry != null) {
            tearDownCovertClaudeWiring(resolvedPath, entry.codeName)
          }
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
  const config = readCovertOpsConfig()
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
    const entry = config.projects[p]
    removeCovertOpsProjectConfig(p)
    if (entry != null) {
      tearDownCovertClaudeWiring(p, entry.codeName)
    }
    console.log(`Covert mode removed for: ${p}`)
  }
}

function tearDownCovertClaudeWiring(
  projectDir: string,
  codeName: string,
): void {
  const covertOpsRoot = path.join(getCovertOpsDir(), codeName)
  const settingsPath = path.join(projectDir, '.claude', 'settings.local.json')

  unregisterNaholoMcpForProject(projectDir)

  if (fs.existsSync(settingsPath)) {
    let settings = readClaudeSettings(settingsPath)
    settings = removeNaholoStopHookFromClaudeSettings(settings)
    settings = removeNaholoCovertPermissionsFromClaudeSettings(
      settings,
      covertOpsRoot,
    )
    writeClaudeSettings(settingsPath, settings)
  }
}
