import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse, stringify } from 'yaml'
import {
  readCovertOpsConfig,
  type CovertOpsProjectConfig,
} from './covert-config.js'

export interface ProjectConfig {
  projectId: string
  projectSlug: string
}

export type ResolvedProjectConfig =
  | { kind: 'project'; root: string; config: ProjectConfig }
  | { kind: 'covert'; root: string; config: CovertOpsProjectConfig }

const PROJECT_CONFIG_DIR = '.naholo'
const PROJECT_CONFIG_FILE = 'config.yml'

export function resolveProjectConfig(): ResolvedProjectConfig | null {
  if (cachedResolution !== undefined) {
    return cachedResolution
  }
  const resolved = walkUp(process.cwd())
  cachedResolution = resolved
  return resolved
}

export function readProjectConfig(): ProjectConfig | null {
  const resolved = resolveProjectConfig()
  if (resolved == null || resolved.kind !== 'project') {
    return null
  }
  return resolved.config
}

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

let cachedResolution: ResolvedProjectConfig | null | undefined

function walkUp(startDir: string): ResolvedProjectConfig | null {
  const home = os.homedir()
  const covertConfig = readCovertOpsConfig()
  let dir = path.resolve(startDir)
  while (true) {
    if (dir === home) {
      return null
    }
    const covertEntry = covertConfig.projects[dir]
    if (covertEntry != null) {
      return { kind: 'covert', root: dir, config: covertEntry }
    }
    const projectConfigPath = path.join(
      dir,
      PROJECT_CONFIG_DIR,
      PROJECT_CONFIG_FILE,
    )
    if (fs.existsSync(projectConfigPath)) {
      const content = fs.readFileSync(projectConfigPath, 'utf-8')
      const config = parse(content) as ProjectConfig
      return { kind: 'project', root: dir, config }
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}
