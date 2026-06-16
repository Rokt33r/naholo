import fs from 'node:fs'
import path from 'node:path'
import { parse, stringify } from 'yaml'
import { ensureNaholoHomeDir, getNaholoHomeDir } from './global-config.js'
import type { ProjectConfig } from './project-config.js'

export interface CovertOpsProjectConfig extends ProjectConfig {
  codeName: string
}

export interface CovertOpsConfig {
  projects: Record<string, CovertOpsProjectConfig>
}

export function getCovertOpsDir(): string {
  return path.join(getNaholoHomeDir(), 'covert-ops')
}

export function getCovertOpsConfigPath(): string {
  return path.join(getCovertOpsDir(), 'config.yml')
}

export function readCovertOpsConfig(): CovertOpsConfig {
  const configPath = getCovertOpsConfigPath()
  if (!fs.existsSync(configPath)) {
    return { projects: {} }
  }
  const content = fs.readFileSync(configPath, 'utf-8')
  const parsed = parse(content) as CovertOpsConfig | null
  if (parsed == null || parsed.projects == null) {
    return { projects: {} }
  }
  return parsed
}

export function writeCovertOpsConfig(config: CovertOpsConfig): void {
  ensureNaholoHomeDir()
  fs.mkdirSync(getCovertOpsDir(), { recursive: true })
  fs.writeFileSync(getCovertOpsConfigPath(), stringify(config), 'utf-8')
}

export function collectExistingCodeNames(config: CovertOpsConfig): Set<string> {
  return new Set(Object.values(config.projects).map((p) => p.codeName))
}

export function removeCovertOpsProjectConfig(targetPath: string): boolean {
  const config = readCovertOpsConfig()
  const entry = config.projects[targetPath]
  if (entry == null) {
    return false
  }

  const codeNameDir = path.join(getCovertOpsDir(), entry.codeName)
  fs.rmSync(codeNameDir, { recursive: true, force: true })

  delete config.projects[targetPath]

  if (Object.keys(config.projects).length === 0) {
    const configPath = getCovertOpsConfigPath()
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath)
    }
  } else {
    writeCovertOpsConfig(config)
  }
  return true
}
