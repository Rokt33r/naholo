import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import { stringify as yamlStringify } from 'yaml'
import { coreSkills } from '../core-skills.js'
import { withErrorHandling } from '../errors.js'
import { getProjectState } from '../lib/project-state.js'
import { getActiveProfile } from '../profile.js'
import { findLegacyStubs } from '../skills.js'
import { version } from '../version.js'

const MIN_PLUGIN_VERSION = '0.1.0'

export const doctorCommand = new Command('doctor')
  .description(
    'Diagnose CLI version, login, project init, and legacy skill stubs',
  )
  .option('--fix', 'delete the detected naholo legacy skill stubs')
  .action(
    withErrorHandling(async (options: { fix?: boolean }) => {
      const active = getActiveProfile()
      const projectState = getProjectState()

      const payload: Record<string, unknown> = {
        version,
        minPluginVersion: MIN_PLUGIN_VERSION,
        loggedIn: active != null,
        profile: active?.name ?? null,
        project:
          projectState == null
            ? null
            : {
                kind: projectState.kind,
                slug: projectState.config.projectSlug,
              },
      }

      const legacyStubs = findLegacyStubs(coreSkills)
      const labels = legacyStubs.map((stub) => `${stub.scope}:${stub.name}`)

      if (options.fix === true) {
        for (const stub of legacyStubs) {
          fs.rmSync(path.dirname(stub.path), { recursive: true, force: true })
        }
        if (labels.length > 0) {
          payload.removedSkillStubs = labels
        }
      } else if (labels.length > 0) {
        payload.legacySkillStubs = labels
      }

      process.stdout.write(yamlStringify(payload))
    }),
  )
