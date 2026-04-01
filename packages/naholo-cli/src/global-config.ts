import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parse, stringify } from 'yaml'

export interface GlobalConfig {
  defaultProfile?: string
}

const NAHOLO_HOME_DIR = path.join(os.homedir(), '.naholo')
const GLOBAL_CONFIG_PATH = path.join(NAHOLO_HOME_DIR, 'config.yml')

export function getNaholoHomeDir(): string {
  return NAHOLO_HOME_DIR
}

export function getGlobalConfigPath(): string {
  return GLOBAL_CONFIG_PATH
}

export function ensureNaholoHomeDir(): void {
  fs.mkdirSync(path.join(NAHOLO_HOME_DIR, 'profiles'), { recursive: true })
}

export function readGlobalConfig(): GlobalConfig {
  if (!fs.existsSync(GLOBAL_CONFIG_PATH)) {
    return {}
  }
  const content = fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf-8')
  return (parse(content) as GlobalConfig) ?? {}
}

export function writeGlobalConfig(globalConfig: GlobalConfig): void {
  ensureNaholoHomeDir()
  fs.writeFileSync(GLOBAL_CONFIG_PATH, stringify(globalConfig), 'utf-8')
}

export function getDefaultProfileName(): string | undefined {
  return readGlobalConfig().defaultProfile
}

export function setDefaultProfile(profileName: string | null): void {
  const globalConfig = readGlobalConfig()
  if (profileName == null) {
    delete globalConfig.defaultProfile
  } else {
    globalConfig.defaultProfile = profileName
  }
  writeGlobalConfig(globalConfig)
}

export function clearDefaultProfile(): void {
  const globalConfig = readGlobalConfig()
  delete globalConfig.defaultProfile
  writeGlobalConfig(globalConfig)
}
