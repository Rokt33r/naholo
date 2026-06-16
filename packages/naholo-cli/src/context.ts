import { NaholoClient } from 'naholo-api/client'
import { CliError } from './errors.js'
import { readGlobalConfig, type GlobalConfig } from './global-config.js'
import { getActiveProfile, type Profile } from './profile.js'

export interface CliContext {
  globalConfig: GlobalConfig
  currentProfile: { name: string; profile: Profile }
  client: NaholoClient
}

export function getCliContext(): CliContext {
  const globalConfig = readGlobalConfig()
  const active = getActiveProfile(globalConfig.defaultProfile)
  if (active == null) {
    throw new CliError('Not logged in. Run "naholo login" to authenticate.')
  }

  const client = new NaholoClient({
    baseUrl: active.profile.baseUrl,
    token: active.profile.token,
  })

  return {
    globalConfig,
    currentProfile: active,
    client,
  }
}
