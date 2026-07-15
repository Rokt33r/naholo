import { Command } from 'commander'
import { stringify as yamlStringify } from 'yaml'
import { coreSkills } from '../core-skills.js'
import { withErrorHandling } from '../errors.js'
import { getProjectState } from '../lib/project-state.js'
import { getActiveProfile } from '../profile.js'
import { findLegacyStubs } from '../skills.js'
import { version } from '../version.js'

export const doctorCommand = new Command('doctor')
  .description(
    'Diagnose CLI version, login, project init, and legacy skill stubs',
  )
  .action(
    withErrorHandling(async () => {
      const active = getActiveProfile()
      const projectState = getProjectState()

      const payload: Record<string, unknown> = {
        version,
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
      if (legacyStubs.length > 0) {
        payload.legacySkillStubs = legacyStubs.map(
          (stub) => `${stub.scope}:${stub.name}`,
        )
      }

      process.stdout.write(yamlStringify(payload))
    }),
  )
