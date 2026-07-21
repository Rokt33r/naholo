import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { getCliContext } from '../context'
import { NoProjectStateCliError } from '../errors'
import { getProjectState } from '../lib/project-state'
import { version } from '../version'
import { registerResources } from './resources'
import { registerTools } from './tools'

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'naholo',
    version,
  })

  const cliContext = getCliContext()
  const projectState = getProjectState()
  if (projectState == null) {
    throw new NoProjectStateCliError()
  }
  const projectSlug = projectState.config.projectSlug
  registerTools(server, cliContext.client, projectSlug)
  registerResources(server, cliContext.client, projectSlug, projectState)

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
