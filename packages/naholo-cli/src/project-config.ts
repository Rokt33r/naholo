import fs from 'node:fs'
import path from 'node:path'
import { parse, stringify } from 'yaml'

export type UploadTranscriptsOnExfil = 'none' | 'redacted' | 'full'

export interface ProjectConfig {
  projectId: string
  projectSlug: string
  uploadTranscriptsOnExfil?: UploadTranscriptsOnExfil
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

export function setProjectConfigUploadMode(
  rootDir: string,
  mode: UploadTranscriptsOnExfil,
): void {
  const configPath = path.join(rootDir, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE)
  const raw = fs.readFileSync(configPath, 'utf-8')
  const config = parse(raw) as ProjectConfig
  config.uploadTranscriptsOnExfil = mode
  fs.writeFileSync(configPath, stringify(config), 'utf-8')
}
