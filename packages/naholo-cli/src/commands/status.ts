import { Command } from 'commander'
import { getCliContext } from '../context.js'
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

      console.log(`Project:    ${project.name}`)
      console.log(
        `URL:        ${cliContext.currentProfile.profile.baseUrl}/app/projects/${projectSlug}`,
      )
      console.log(`Profile:    ${cliContext.currentProfile.name}`)
    }),
  )
