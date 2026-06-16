import fs from 'node:fs'
import path from 'node:path'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import { getCovertOpsDir } from '../covert-config.js'
import { CliError } from '../errors.js'
import { resolveProjectConfig } from '../project-config.js'

export function getNaholoLocalDir(): string | null {
  const resolved = resolveProjectConfig()
  if (resolved == null) {
    return null
  }
  if (resolved.kind === 'covert') {
    return path.join(getCovertOpsDir(), resolved.config.codeName)
  }
  return path.join(resolved.root, '.naholo/local')
}

export function getLocalOperationDir(): string {
  const local = getNaholoLocalDir()
  if (local == null) {
    throw new CliError(
      'No .naholo/config.yml found in this directory or any ancestor up to your home directory, and no covert mode entry matches. Run "naholo init" or "naholo covert init" to initialize.',
    )
  }
  return path.join(local, 'infiled')
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

export function getTasksPath(): string {
  return path.join(getLocalOperationDir(), 'TASKS.md')
}

export function getBaseTasksPath(): string {
  return path.join(getBaseDir(), 'TASKS.md')
}

export interface OpYml {
  number: number
  title: string
}

export function getOpYmlPath(): string {
  return path.join(getLocalOperationDir(), 'op.yml')
}

export function readOpYml(): OpYml | null {
  const local = getNaholoLocalDir()
  if (local == null) {
    return null
  }
  const ymlPath = path.join(local, 'infiled', 'op.yml')
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

export function renderOpStatusYaml(): string | null {
  const opYml = readOpYml()
  if (opYml == null) {
    return null
  }
  const opPath = getLocalOperationDir()
  const notesDir = getNotesDir()
  const opNotes = fs.existsSync(notesDir)
    ? fs
        .readdirSync(notesDir)
        .filter((entry) => entry.endsWith('.md'))
        .map((entry) => entry.slice(0, -3))
        .sort()
    : []
  return yamlStringify({
    currentOp: opYml.number,
    opTitle: opYml.title,
    opPath: opPath.endsWith(path.sep) ? opPath : opPath + path.sep,
    opNotes,
  })
}
