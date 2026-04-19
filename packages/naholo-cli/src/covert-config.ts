import fs from 'node:fs'
import path from 'node:path'
import { parse, stringify } from 'yaml'
import { ensureNaholoHomeDir, getNaholoHomeDir } from './global-config.js'
import type { ProjectConfig } from './project-config.js'

export interface CovertModeConfig {
  projects: Record<string, ProjectConfig>
}

export function getCovertConfigPath(): string {
  return path.join(getNaholoHomeDir(), 'covert-mode-config.yml')
}

export function readCovertConfig(): CovertModeConfig {
  const configPath = getCovertConfigPath()
  if (!fs.existsSync(configPath)) {
    return { projects: {} }
  }
  const content = fs.readFileSync(configPath, 'utf-8')
  const parsed = parse(content) as CovertModeConfig | null
  if (parsed == null || parsed.projects == null) {
    return { projects: {} }
  }
  return parsed
}

export function writeCovertConfig(config: CovertModeConfig): void {
  ensureNaholoHomeDir()
  fs.writeFileSync(getCovertConfigPath(), stringify(config), 'utf-8')
}

export function getCovertProjectConfig(cwd: string): ProjectConfig | null {
  const config = readCovertConfig()
  const entry = config.projects[cwd]
  if (entry == null) {
    return null
  }
  return entry
}

export function removeCovertProjectConfig(targetPath: string): boolean {
  const config = readCovertConfig()
  if (config.projects[targetPath] == null) {
    return false
  }
  delete config.projects[targetPath]

  if (Object.keys(config.projects).length === 0) {
    const configPath = getCovertConfigPath()
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath)
    }
  } else {
    writeCovertConfig(config)
  }
  return true
}
