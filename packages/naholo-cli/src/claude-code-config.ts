import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

interface ClaudeJsonProject {
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

interface ClaudeJson {
  projects?: Record<string, ClaudeJsonProject>
  [key: string]: unknown
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

export function unregisterNaholoMcpForProject(projectDir: string): void {
  const claudeJsonPath = path.join(os.homedir(), '.claude.json')
  if (!fs.existsSync(claudeJsonPath)) {
    return
  }

  const raw = fs.readFileSync(claudeJsonPath, 'utf-8')
  const config = JSON.parse(raw) as ClaudeJson
  const mcpServers = config.projects?.[projectDir]?.mcpServers
  if (mcpServers == null || !('naholo' in mcpServers)) {
    return
  }

  delete mcpServers.naholo
  fs.writeFileSync(claudeJsonPath, JSON.stringify(config, null, 2) + '\n')
}
