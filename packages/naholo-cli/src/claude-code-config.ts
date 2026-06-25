import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

interface ClaudeJsonProject {
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

interface ClaudeJson {
  mcpServers?: Record<string, unknown>
  permissions?: {
    allow?: string[]
    deny?: string[]
    ask?: string[]
  }
  projects?: Record<string, ClaudeJsonProject>
  [key: string]: unknown
}

export function writeGlobalClaudeConfig(): void {
  const claudeJsonPath = path.join(os.homedir(), '.claude.json')
  const naholoEntry = { command: 'naholo', args: ['mcp'] }

  let config: ClaudeJson = {}

  if (fs.existsSync(claudeJsonPath)) {
    const raw = fs.readFileSync(claudeJsonPath, 'utf-8')
    config = JSON.parse(raw) as ClaudeJson
  }

  if (config.mcpServers == null) {
    config.mcpServers = {}
  }
  config.mcpServers.naholo = naholoEntry

  const requiredPermissions = ['mcp__naholo__*', 'Bash(naholo agent *)']

  if (config.permissions == null) {
    config.permissions = {}
  }
  if (config.permissions.allow == null) {
    config.permissions.allow = []
  }

  for (const permission of requiredPermissions) {
    if (!config.permissions.allow.includes(permission)) {
      config.permissions.allow.push(permission)
    }
  }

  fs.writeFileSync(claudeJsonPath, JSON.stringify(config, null, 2) + '\n')
}

export function registerNaholoMcpForProject(projectDir: string): void {
  const claudeJsonPath = path.join(os.homedir(), '.claude.json')

  let config: ClaudeJson = {}
  if (fs.existsSync(claudeJsonPath)) {
    const raw = fs.readFileSync(claudeJsonPath, 'utf-8')
    config = JSON.parse(raw) as ClaudeJson
  }

  if (config.projects == null) {
    config.projects = {}
  }
  const project = config.projects[projectDir] ?? {}
  if (project.mcpServers == null) {
    project.mcpServers = {}
  }
  project.mcpServers.naholo = { command: 'naholo', args: ['mcp'] }
  config.projects[projectDir] = project

  fs.writeFileSync(claudeJsonPath, JSON.stringify(config, null, 2) + '\n')
}
