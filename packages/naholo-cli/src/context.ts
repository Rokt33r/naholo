import { NaholoClient } from 'naholo-api/client'
import { CliError } from './errors.js'
import { readGlobalConfig, type GlobalConfig } from './global-config.js'
import { getActiveProfile, type Profile } from './profile.js'
import { resolveProjectConfig, type ProjectConfig } from './project-config.js'

export interface CliContext {
  globalConfig: GlobalConfig
  projectConfig: ProjectConfig
  projectSlug: string
  currentProfile: { name: string; profile: Profile }
  client: NaholoClient
}

export function getCliContext(): CliContext {
  const globalConfig = readGlobalConfig()
  const active = getActiveProfile(globalConfig.defaultProfile)
  if (active == null) {
    throw new CliError('Not logged in. Run "naholo login" to authenticate.')
  }

  const resolved = resolveProjectConfig()
  if (resolved == null) {
    throw new CliError(
      'No .naholo/config.yml found in this directory or any ancestor up to your home directory, and no covert mode entry matches. Run "naholo init" or "naholo covert init" to initialize.',
    )
  }

  const client = new NaholoClient({
    baseUrl: active.profile.baseUrl,
    token: active.profile.token,
  })

  return {
    globalConfig,
    projectConfig: resolved.config,
    projectSlug: resolved.config.projectSlug,
    currentProfile: active,
    client,
  }
}
