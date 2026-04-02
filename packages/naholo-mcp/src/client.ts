import { NaholoClient } from 'naholo-api/client'

let cachedClient: NaholoClient | null = null

export function getClient(): NaholoClient {
  if (cachedClient != null) {
    return cachedClient
  }

  const baseUrl = process.env.NAHOLO_URL
  const token = process.env.NAHOLO_TOKEN

  if (!baseUrl) {
    throw new Error('NAHOLO_URL environment variable is required')
  }
  if (!token) {
    throw new Error('NAHOLO_TOKEN environment variable is required')
  }

  cachedClient = new NaholoClient({ baseUrl, token })
  return cachedClient
}

export function getProjectId(): string {
  const projectId = process.env.NAHOLO_PROJECT_ID
  if (!projectId) {
    throw new Error('NAHOLO_PROJECT_ID environment variable is required')
  }
  return projectId
}
