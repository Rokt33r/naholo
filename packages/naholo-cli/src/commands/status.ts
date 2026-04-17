import { Command } from 'commander'
import { getCliContext } from '../context.js'
import { withErrorHandling } from '../errors.js'

export const statusCommand = new Command('status')
  .description('Show project and worker info')
  .action(
    withErrorHandling(
      async (_options: Record<string, unknown>, cmd: Command) => {
        const { client, projectSlug, projectWorkerId, currentProfile } =
          getCliContext()

        const project = await client.getProject(projectSlug)
        const worker = await client.getWorker(projectSlug, projectWorkerId)

        console.log(`Project:    ${project.name}`)
        console.log(
          `URL:        ${currentProfile.profile.baseUrl}/app/projects/${projectSlug}`,
        )
        console.log(`Worker:     ${worker.name} (${worker.type})`)
        console.log(`Profile:    ${currentProfile.name}`)
      },
    ),
  )
