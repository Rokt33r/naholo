import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { getCliContext } from '../context.js'
import { version } from '../version.js'
import { registerResources } from './resources.js'
import { registerTools } from './tools.js'

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'naholo',
    version,
  })

  const ctx = getCliContext()
  const { client, projectSlug } = ctx
  registerTools(server, client, projectSlug)
  registerResources(server, client, projectSlug)

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
