import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

interface ClaudeJson {
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

interface ClaudeSettings {
  permissions?: {
    allow?: string[]
    deny?: string[]
    ask?: string[]
  }
  [key: string]: unknown
}

export function writeGlobalMcpConfig(): void {
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

  fs.writeFileSync(claudeJsonPath, JSON.stringify(config, null, 2) + '\n')
}

export function writeGlobalClaudePermissions(): void {
  const claudeDir = path.join(os.homedir(), '.claude')
  const settingsPath = path.join(claudeDir, 'settings.local.json')
  const naholoPermission = 'mcp__naholo__*'

  let config: ClaudeSettings = {}

  if (fs.existsSync(settingsPath)) {
    const raw = fs.readFileSync(settingsPath, 'utf-8')
    config = JSON.parse(raw) as ClaudeSettings
  }

  if (config.permissions == null) {
    config.permissions = {}
  }
  if (config.permissions.allow == null) {
    config.permissions.allow = []
  }

  if (!config.permissions.allow.includes(naholoPermission)) {
    config.permissions.allow.push(naholoPermission)
  }

  fs.mkdirSync(claudeDir, { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(config, null, 2) + '\n')
}
