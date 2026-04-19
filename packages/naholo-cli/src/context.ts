import { NaholoClient } from 'naholo-api/client'
import { CliError } from './errors.js'
import { readGlobalConfig, type GlobalConfig } from './global-config.js'
import { getActiveProfile, type Profile } from './profile.js'
import { readProjectConfig, type ProjectConfig } from './project-config.js'
import { getCovertProjectConfig } from './covert-config.js'

export interface CliContext {
  globalConfig: GlobalConfig
  projectConfig: ProjectConfig
  projectSlug: string
  projectWorkerId: string
  currentProfile: { name: string; profile: Profile }
  client: NaholoClient
}

export function getCliContext(): CliContext {
  const globalConfig = readGlobalConfig()
  const active = getActiveProfile(globalConfig.defaultProfile)
  if (active == null) {
    throw new CliError('Not logged in. Run "naholo login" to authenticate.')
  }

  const projectConfig =
    getCovertProjectConfig(process.cwd()) ?? readProjectConfig()
  if (projectConfig == null) {
    throw new CliError(
      'Naholo hasn\'t been initialized in this codebase. Neither .naholo/config.yml detected in this codebase nor CWD has been registered in ~/.naholo/covert-mode-config.yml. Run  "naholo init" or "naholo covert init" to initialize.',
    )
  }

  const projectWorkerId = projectConfig.projectWorkerId

  const client = new NaholoClient({
    baseUrl: active.profile.baseUrl,
    token: active.profile.token,
    projectWorkerId,
  })

  const projectSlug = projectConfig.projectSlug

  return {
    globalConfig,
    projectConfig,
    projectSlug,
    projectWorkerId,
    currentProfile: active,
    client,
  }
}
