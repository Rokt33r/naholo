import confirm from '@inquirer/confirm'
import select from '@inquirer/select'
import { Command } from 'commander'
import { NaholoClient } from 'naholo-api/client'
import type { ProjectWithWorker } from 'naholo-api/types'
import { readLocalConfig, writeLocalConfig } from '../local-config.js'
import { getActiveProfile } from '../profile.js'
import {
  type ProjectConfig,
  readProjectConfig,
  writeProjectConfig,
  writeGitignore,
} from '../project-config.js'
import { syncSkills } from '../skills.js'

export const initCommand = new Command('init')
  .description('Initialize Naholo project in the current directory')
  .option('--profile <name>', 'use a specific profile instead of default')
  .action(async (options: Record<string, string>, cmd: Command) => {
    const profileOverride =
      typeof options.profile !== 'string' ? options.profile : undefined

    const active = getActiveProfile(profileOverride)
    if (active == null) {
      console.error('Not logged in. Run "naholo login" to authenticate.')
      process.exit(2)
    }

    const { profile } = active
    const client = new NaholoClient({
      baseUrl: profile.baseUrl,
      token: profile.token,
    })

    const existingProjectConfig = readProjectConfig()

    if (existingProjectConfig != null) {
      await handleSubsequentInit(client, existingProjectConfig)
    } else {
      await handleFirstTimeInit(client)
    }
  })

async function handleFirstTimeInit(client: NaholoClient): Promise<void> {
  // 1-2. Fetch projects linked to the user
  const projects = await client.listProjects()
  if (projects.length === 0) {
    console.error('No projects found for your account.')
    process.exit(1)
  }

  // 3. Prompt user to select a project
  const selectedProject = await select<ProjectWithWorker>({
    message: 'Select a project',
    choices: projects.map((p) => ({
      name: p.name,
      value: p,
    })),
  })

  // 4. Ask which worker to use
  const workers = await client.listWorkers(selectedProject.id)
  const selectableWorkers = workers.filter(
    (w) =>
      (w.type === 'user' &&
        w.userId ===
          (selectedProject.projectWorkerOfCurrentUser as { userId?: string })
            .userId) ||
      w.type === 'bot',
  )

  if (selectableWorkers.length === 0) {
    console.error('Unexpected error: No selectable workers.')
    process.exit(1)
  }

  const ownWorkerId = selectedProject.projectWorkerOfCurrentUser.id

  const selectedWorkerId = await select<string>({
    message: 'Select a worker',
    choices: selectableWorkers.map((w) => ({
      name: `${w.name} (${w.id === ownWorkerId ? 'you' : w.type})`,
      value: w.id,
    })),
    default: ownWorkerId,
  })

  const selectedWorker = selectableWorkers.find(
    (w) => w.id === selectedWorkerId,
  )!

  // 5. Ask to set as default worker
  let defaultWorkerId: string | undefined
  const setDefault = await confirm({
    message: `Set "${selectedWorker.name}" as the default worker for this project?`,
    default: true,
  })
  if (setDefault) {
    defaultWorkerId = selectedWorkerId
  }

  // 6. Write .naholo/config.yml
  const projectConfig: ProjectConfig = {
    projectId: selectedProject.id,
  }
  if (defaultWorkerId != null) {
    projectConfig.defaultWorkerId = defaultWorkerId
  }
  writeProjectConfig(projectConfig)

  // 7. Write .naholo/local/local-config.yml
  writeLocalConfig({ projectWorkerId: selectedWorkerId })

  // 8. Write .naholo/.gitignore
  writeGitignore()

  console.log()
  console.log(`Project initialized: ${selectedProject.name}`)
  console.log(`Worker: ${selectedWorker.name}(${selectedWorker.type})`)
  console.log()

  // 9. Sync skills
  const shouldSync = await confirm({
    message:
      'Sync skills now? This will remove all existing skill stubs in .claude/skills/ and recreate them from the server.',
    default: true,
  })
  if (shouldSync) {
    await syncSkills(client, selectedProject.id)
  } else {
    console.log('Skipped skill sync. Run "naholo skills sync" later.')
  }

  // 10. Instruct next steps
  console.log()
  console.log('Next steps:')
  console.log('  git add .naholo/')
  console.log('  git commit -m "Add naholo project config"')
}

async function handleSubsequentInit(
  client: NaholoClient,
  projectConfig: ProjectConfig,
): Promise<void> {
  const existingLocalConfig = readLocalConfig()

  if (existingLocalConfig != null) {
    console.log(`Current worker ID: ${existingLocalConfig.projectWorkerId}`)
    console.log()
  }

  // Fetch workers
  const workers = await client.listWorkers(projectConfig.projectId)
  if (workers.length === 0) {
    console.error('Unexpected error: No selectable workers.')
    process.exit(1)
  }

  // Pre-select defaultWorkerId if valid
  let defaultWorkerExists = false
  if (projectConfig.defaultWorkerId != null) {
    defaultWorkerExists = workers.some(
      (w) => w.id === projectConfig.defaultWorkerId,
    )
    if (!defaultWorkerExists) {
      console.warn(
        `Warning: default worker (${projectConfig.defaultWorkerId}) no longer exists in this project.`,
      )
    }
  }

  // Default priority: 1) existing local config, 2) project default, 3) own worker
  const user = await client.getAuthUser()
  const ownWorkerId = workers.find((w) => w.userId === user.id)?.id

  const defaultSelectId =
    existingLocalConfig?.projectWorkerId ??
    (defaultWorkerExists ? projectConfig.defaultWorkerId : null) ??
    ownWorkerId

  const selectedWorkerId = await select<string>({
    message: 'Select a worker',
    choices: workers.map((w) => ({
      name: `${w.name} (${w.type})`,
      value: w.id,
    })),
    default: defaultSelectId,
  })

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId)!

  // Only ask to update defaultWorkerId if current one is missing
  if (!defaultWorkerExists) {
    const setDefault = await confirm({
      message: `Set "${selectedWorker.name}" as the default worker for this project?`,
      default: true,
    })
    if (setDefault) {
      writeProjectConfig({
        ...projectConfig,
        defaultWorkerId: selectedWorkerId,
      })
    }
  }

  // Write/update local config
  writeLocalConfig({ projectWorkerId: selectedWorkerId })

  console.log(`Worker set to: ${selectedWorker.name}`)

  // Sync skills
  const shouldSync = await confirm({
    message:
      'Sync skills now? This will remove all existing skill stubs in .claude/skills/ and recreate them from the server.',
    default: true,
  })
  if (shouldSync) {
    await syncSkills(client, projectConfig.projectId)
  } else {
    console.log('Skipped skill sync. Run "naholo skills sync" later.')
  }
}
