import fs from 'node:fs'
import path from 'node:path'
import { stringify } from 'yaml'

export interface ProjectConfig {
  projectId: string
  projectSlug: string
}

const PROJECT_CONFIG_DIR = '.naholo'
const PROJECT_CONFIG_FILE = 'config.yml'

export function writeProjectConfigInCwdNaholoDir(config: ProjectConfig): void {
  fs.mkdirSync(path.resolve(PROJECT_CONFIG_DIR), { recursive: true })
  fs.writeFileSync(
    path.resolve(PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE),
    stringify(config),
    'utf-8',
  )
}

export function writeGitignoreInCwdNaholoDir(): void {
  fs.writeFileSync(
    path.resolve(PROJECT_CONFIG_DIR, '.gitignore'),
    'local/\n',
    'utf-8',
  )
}
