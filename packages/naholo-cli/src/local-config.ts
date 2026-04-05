import fs from 'node:fs'
import path from 'node:path'
import { parse, stringify } from 'yaml'

export interface LocalConfig {
  projectWorkerId: string
}

const LOCAL_CONFIG_DIR = path.join('.naholo', 'local')
const LOCAL_CONFIG_FILE = 'local-config.yml'

export function getLocalConfigPath(): string {
  return path.resolve(LOCAL_CONFIG_DIR, LOCAL_CONFIG_FILE)
}

export function readLocalConfig(): LocalConfig | null {
  const configPath = getLocalConfigPath()
  if (!fs.existsSync(configPath)) {
    return null
  }
  const content = fs.readFileSync(configPath, 'utf-8')
  return parse(content) as LocalConfig
}

export function writeLocalConfig(config: LocalConfig): void {
  const dir = path.resolve(LOCAL_CONFIG_DIR)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(getLocalConfigPath(), stringify(config), 'utf-8')
}
