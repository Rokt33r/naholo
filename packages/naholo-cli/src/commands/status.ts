import { Command } from 'commander'
import { getCliContext } from '../context.js'
import { withErrorHandling } from '../errors.js'

export const statusCommand = new Command('status')
  .description('Show project and operator info')
  .action(
    withErrorHandling(
      async (_options: Record<string, unknown>, cmd: Command) => {
        const { client, projectSlug, currentProfile } = getCliContext()

        const project = await client.getProject(projectSlug)

        console.log(`Project:    ${project.name}`)
        console.log(
          `URL:        ${currentProfile.profile.baseUrl}/app/projects/${projectSlug}`,
        )
        console.log(`Profile:    ${currentProfile.name}`)
      },
    ),
  )
