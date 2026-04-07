import { Command } from 'commander'
import { getCliContext } from '../context.js'

export const statusCommand = new Command('status')
  .description('Show project and worker info')
  .action(async (_options: Record<string, unknown>, cmd: Command) => {
    const ctx = getCliContext()
    const { client, projectConfig, localConfig, currentProfile } = ctx

    const project = await client.getProject(projectConfig.projectId)
    const worker = await client.getWorker(
      projectConfig.projectId,
      localConfig.projectWorkerId,
    )

    console.log(`Project:    ${project.name}`)
    console.log(
      `URL:        ${currentProfile.profile.baseUrl}/app/projects/${projectConfig.projectId}`,
    )
    console.log(`Worker:     ${worker.name} (${worker.type})`)
    console.log(`Profile:    ${currentProfile.name}`)
  })
