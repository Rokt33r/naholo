import fs from 'node:fs'
import path from 'node:path'
import { parse, stringify } from 'yaml'

export interface ProjectConfig {
  projectId: string
  projectSlug: string
}

const PROJECT_CONFIG_DIR = '.naholo'
const PROJECT_CONFIG_FILE = 'config.yml'

export function getProjectConfigDir(): string {
  return path.resolve(PROJECT_CONFIG_DIR)
}

export function getProjectConfigPath(): string {
  return path.resolve(PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE)
}

export function readProjectConfig(): ProjectConfig | null {
  const configPath = getProjectConfigPath()
  if (!fs.existsSync(configPath)) {
    return null
  }
  const content = fs.readFileSync(configPath, 'utf-8')
  return parse(content) as ProjectConfig
}

export function writeProjectConfig(config: ProjectConfig): void {
  const dir = getProjectConfigDir()
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(getProjectConfigPath(), stringify(config), 'utf-8')
}

export function writeGitignore(): void {
  const gitignorePath = path.join(getProjectConfigDir(), '.gitignore')
  fs.writeFileSync(gitignorePath, 'local/\n', 'utf-8')
}
