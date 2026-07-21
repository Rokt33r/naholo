import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse, stringify as yamlStringify } from 'yaml'
import {
  getCovertOpsDir,
  readCovertOpsConfig,
  type CovertOpsProjectConfig,
} from '../covert-config'
import type { ProjectConfig } from '../project-config'
import {
  localAgentTranscriptEntrySchema,
  type LocalAgentTranscriptEntry,
} from './agent-transcripts'

export type HookSource = 'claude-code-stop'

export interface OpYml {
  number: number
  title: string
}

export interface OpStatusFields {
  currentOp: number
  opTitle: string
  opPath: string
  opNotes: string[]
}

const PROJECT_CONFIG_DIR = '.naholo'
const PROJECT_CONFIG_FILE = 'config.yml'

export class ProjectState {
  constructor(
    readonly kind: 'project' | 'covert',
    readonly root: string,
    readonly config: ProjectConfig | CovertOpsProjectConfig,
  ) {}

  getNaholoLocalDir(): string {
    if (this.kind === 'covert') {
      return path.join(
        getCovertOpsDir(),
        (this.config as CovertOpsProjectConfig).codeName,
      )
    }
    return path.join(this.root, '.naholo/local')
  }

  getInfilledDir(): string {
    return path.join(this.getNaholoLocalDir(), 'infilled')
  }

  getNotesDir(): string {
    return path.join(this.getInfilledDir(), 'notes')
  }

  getBaseDir(): string {
    return path.join(this.getInfilledDir(), '.base')
  }

  getBaseNotesDir(): string {
    return path.join(this.getBaseDir(), 'notes')
  }

  getTasksPath(): string {
    return path.join(this.getInfilledDir(), 'TASKS.md')
  }

  getBaseTasksPath(): string {
    return path.join(this.getBaseDir(), 'TASKS.md')
  }

  getOpYmlPath(): string {
    return path.join(this.getInfilledDir(), 'op.yml')
  }

  getAgentTranscriptsYmlPath(): string {
    return path.join(this.getInfilledDir(), 'agent-transcripts.yml')
  }

  readOpYml(): OpYml | null {
    const ymlPath = this.getOpYmlPath()
    if (!fs.existsSync(ymlPath)) {
      return null
    }
    const raw = fs.readFileSync(ymlPath, 'utf-8')
    const parsed = parse(raw) as { number?: unknown; title?: unknown } | null
    if (
      parsed == null ||
      typeof parsed.number !== 'number' ||
      typeof parsed.title !== 'string'
    ) {
      return null
    }
    return { number: parsed.number, title: parsed.title }
  }

  writeOpYml(info: OpYml): void {
    fs.mkdirSync(this.getInfilledDir(), { recursive: true })
    fs.writeFileSync(this.getOpYmlPath(), yamlStringify(info))
  }

  getOpStatusFields(): OpStatusFields | null {
    const opYml = this.readOpYml()
    if (opYml == null) {
      return null
    }
    const infilledDir = this.getInfilledDir()
    const opPath = infilledDir.endsWith(path.sep)
      ? infilledDir
      : infilledDir + path.sep
    const notesDir = this.getNotesDir()
    const opNotes = fs.existsSync(notesDir)
      ? fs
          .readdirSync(notesDir)
          .filter((entry) => entry.endsWith('.md'))
          .map((entry) => entry.slice(0, -3))
          .sort()
      : []
    return {
      currentOp: opYml.number,
      opTitle: opYml.title,
      opPath,
      opNotes,
    }
  }

  renderOpStatusYaml(): string | null {
    const fields = this.getOpStatusFields()
    if (fields == null) {
      return null
    }
    return yamlStringify(fields)
  }

  appendHookError(source: HookSource, message: string): void {
    const logPath = path.join(this.getNaholoLocalDir(), 'hook-errors.log')
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    const line = `${new Date().toISOString()} [${source}] ${message}\n`
    fs.appendFileSync(logPath, line)
  }

  readLocalAgentTranscripts(): LocalAgentTranscriptEntry[] {
    const ymlPath = this.getAgentTranscriptsYmlPath()
    if (!fs.existsSync(ymlPath)) {
      return []
    }
    const raw = fs.readFileSync(ymlPath, 'utf-8')
    const parsed = parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    const result: LocalAgentTranscriptEntry[] = []
    for (const entry of parsed) {
      const validated = localAgentTranscriptEntrySchema.safeParse(entry)
      if (validated.success) {
        result.push(validated.data)
      }
    }
    return result
  }

  upsertLocalAgentTranscript(entry: LocalAgentTranscriptEntry): void {
    const existing = this.readLocalAgentTranscripts()
    const next = existing.filter((e) => e.transcript_id !== entry.transcript_id)
    next.push(entry)
    const ymlPath = this.getAgentTranscriptsYmlPath()
    fs.mkdirSync(path.dirname(ymlPath), { recursive: true })
    fs.writeFileSync(ymlPath, yamlStringify(next))
  }
}

export function getProjectState(
  startDir: string = process.cwd(),
): ProjectState | null {
  const home = os.homedir()
  const covertConfig = readCovertOpsConfig()
  let dir = path.resolve(startDir)
  while (true) {
    if (dir === home) {
      return null
    }
    const covertEntry = covertConfig.projects[dir]
    if (covertEntry != null) {
      return new ProjectState('covert', dir, covertEntry)
    }
    const projectConfigPath = path.join(
      dir,
      PROJECT_CONFIG_DIR,
      PROJECT_CONFIG_FILE,
    )
    if (fs.existsSync(projectConfigPath)) {
      const content = fs.readFileSync(projectConfigPath, 'utf-8')
      const config = parse(content) as ProjectConfig
      return new ProjectState('project', dir, config)
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}
