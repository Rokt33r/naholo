import fs from 'node:fs'
import path from 'node:path'

interface McpJson {
  mcpServers?: Record<string, unknown>
  [key: string]: unknown
}

export function writeProjectMcpJson(projectRoot: string): void {
  const mcpJsonPath = path.join(projectRoot, '.mcp.json')

  let config: McpJson = {}
  if (fs.existsSync(mcpJsonPath)) {
    const raw = fs.readFileSync(mcpJsonPath, 'utf-8').trim()
    if (raw.length > 0) {
      const parsed: unknown = JSON.parse(raw)
      if (
        parsed != null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        config = parsed as McpJson
      }
    }
  }

  if (config.mcpServers == null) {
    config.mcpServers = {}
  }
  config.mcpServers.naholo = { command: 'naholo', args: ['mcp'] }

  fs.writeFileSync(mcpJsonPath, JSON.stringify(config, null, 2) + '\n')
}
