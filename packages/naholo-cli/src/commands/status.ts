import path from 'node:path'
import { Command } from 'commander'
import { stringify as yamlStringify } from 'yaml'
import { getCliContext } from '../context.js'
import { getCovertOpsConfigPath } from '../covert-config.js'
import { NoProjectStateCliError, withErrorHandling } from '../errors.js'
import { getProjectState } from '../lib/project-state.js'

export const statusCommand = new Command('status')
  .description('Show project and operator info')
  .action(
    withErrorHandling(async () => {
      const cliContext = getCliContext()
      const projectState = getProjectState()
      if (projectState == null) {
        throw new NoProjectStateCliError()
      }
      const projectSlug = projectState.config.projectSlug

      const project = await cliContext.client.getProject(projectSlug)

      const projectConfig =
        projectState.kind === 'covert'
          ? getCovertOpsConfigPath()
          : path.join(projectState.root, '.naholo/config.yml')

      const payload: Record<string, unknown> = {
        profile: cliContext.currentProfile.name,
        project: project.name,
        projectUrl: `${cliContext.currentProfile.profile.baseUrl}/app/projects/${projectSlug}`,
        projectConfig,
      }

      const opStatus = projectState.getOpStatusFields()
      if (opStatus != null) {
        const infilledOp: Record<string, unknown> = {
          number: opStatus.currentOp,
          title: opStatus.opTitle,
          path: opStatus.opPath,
        }
        if (opStatus.opNotes.length > 0) {
          infilledOp.notes = opStatus.opNotes
        }
        payload.infilledOp = infilledOp
      }

      process.stdout.write(yamlStringify(payload))
    }),
  )
