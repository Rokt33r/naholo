import { NaholoClient } from 'naholo-api/client'
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
    console.error('Not logged in. Run "naholo login" to authenticate.')
    process.exit(2)
  }

  const projectConfig = readProjectConfig()
  if (projectConfig == null) {
    console.error(
      'No project config found. Run "naholo init" to set up this project.',
    )
    process.exit(2)
  }

  const localConfig = readLocalConfig()
  if (localConfig == null) {
    console.error(
      'No local config found. Run "naholo init" to set up your worker.',
    )
    process.exit(2)
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
