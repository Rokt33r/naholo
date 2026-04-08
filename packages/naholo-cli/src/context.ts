import { NaholoClient } from 'naholo-api/client'
import { CliError } from './errors.js'
import { readGlobalConfig, type GlobalConfig } from './global-config.js'
import { readLocalConfig, type LocalConfig } from './local-config.js'
import { getActiveProfile, type Profile } from './profile.js'
import { readProjectConfig, type ProjectConfig } from './project-config.js'

export interface CliContext {
  globalConfig: GlobalConfig
  projectConfig: ProjectConfig
  localConfig: LocalConfig
  currentProfile: { name: string; profile: Profile }
  client: NaholoClient
}

export function getCliContext(): CliContext {
  const globalConfig = readGlobalConfig()
  const active = getActiveProfile(globalConfig.defaultProfile)
  if (active == null) {
    throw new CliError('Not logged in. Run "naholo login" to authenticate.')
  }

  const projectConfig = readProjectConfig()
  if (projectConfig == null) {
    throw new CliError(
      'No project config found. Run "naholo init" to set up this project.',
    )
  }

  const localConfig = readLocalConfig()
  if (localConfig == null) {
    throw new CliError(
      'No local config found. Run "naholo init" to set up your worker.',
    )
  }

  const client = new NaholoClient({
    baseUrl: active.profile.baseUrl,
    token: active.profile.token,
    projectWorkerId: localConfig.projectWorkerId,
  })

  return {
    globalConfig,
    projectConfig,
    localConfig,
    currentProfile: active,
    client,
  }
}
