import fs from 'node:fs'
import path from 'node:path'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import {
  getCovertOpsDir,
  readCovertOpsProjectConfig,
} from '../covert-config.js'

export function getLocalOperationsRootDir(): string {
  const covertEntry = readCovertOpsProjectConfig(process.cwd())
  if (covertEntry != null) {
    return path.join(getCovertOpsDir(), covertEntry.codeName, 'infiled')
  }
  return path.resolve('.naholo/local/infiled')
}

export function getLocalOperationDir(): string {
  return getLocalOperationsRootDir()
}

export function getBaseDir(): string {
  return path.join(getLocalOperationDir(), '.base')
}

export function getNotesDir(): string {
  return path.join(getLocalOperationDir(), 'notes')
}

export function getBaseNotesDir(): string {
  return path.join(getBaseDir(), 'notes')
}

export function getObjectivesPath(): string {
  return path.join(getLocalOperationDir(), 'OBJECTIVES.md')
}

export function getBaseObjectivesPath(): string {
  return path.join(getBaseDir(), 'OBJECTIVES.md')
}

export interface OpYml {
  number: number
  title: string
}

export function getOpYmlPath(): string {
  return path.join(getLocalOperationDir(), 'op.yml')
}

export function readOpYml(): OpYml | null {
  const ymlPath = getOpYmlPath()
  if (!fs.existsSync(ymlPath)) {
    return null
  }
  const raw = fs.readFileSync(ymlPath, 'utf-8')
  const parsed = yamlParse(raw) as { number?: unknown; title?: unknown } | null
  if (
    parsed == null ||
    typeof parsed.number !== 'number' ||
    typeof parsed.title !== 'string'
  ) {
    return null
  }
  return { number: parsed.number, title: parsed.title }
}

export function writeOpYml(info: OpYml): void {
  fs.mkdirSync(getLocalOperationDir(), { recursive: true })
  fs.writeFileSync(getOpYmlPath(), yamlStringify(info))
}
