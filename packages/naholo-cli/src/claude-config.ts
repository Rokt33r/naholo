import fs from 'node:fs'
import path from 'node:path'

interface ClaudeSettings {
  permissions?: {
    allow?: string[]
    deny?: string[]
    ask?: string[]
  }
  [key: string]: unknown
}

export function writeClaudeProjectSettings(): void {
  const dir = path.resolve('.claude')
  const settingsPath = path.join(dir, 'settings.json')
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

  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(config, null, 2) + '\n')
}
