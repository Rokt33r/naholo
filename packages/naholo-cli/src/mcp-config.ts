import fs from 'node:fs'
import path from 'node:path'

interface McpConfig {
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

export function writeMcpConfig(): void {
  const mcpPath = path.resolve('.mcp.json')
  const naholoEntry = { command: 'naholo', args: ['mcp'] }

  let config: McpConfig = {}

  if (fs.existsSync(mcpPath)) {
    const raw = fs.readFileSync(mcpPath, 'utf-8')
    config = JSON.parse(raw) as McpConfig
  }

  if (config.mcpServers == null) {
    config.mcpServers = {}
  }
  config.mcpServers.naholo = naholoEntry

  fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2) + '\n')
}
