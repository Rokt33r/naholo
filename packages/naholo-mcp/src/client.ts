const baseUrl = process.env.NAHOLO_URL
const token = process.env.NAHOLO_TOKEN
const projectId = process.env.NAHOLO_PROJECT_ID

export function getConfig() {
  if (!baseUrl) {
    throw new Error('NAHOLO_URL environment variable is required')
  }
  if (!token) {
    throw new Error('NAHOLO_TOKEN environment variable is required')
  }
  if (!projectId) {
    throw new Error('NAHOLO_PROJECT_ID environment variable is required')
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), token, projectId }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { baseUrl, token } = getConfig()
  const url = `${baseUrl}${path}`

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<T>
}

function projectPath(path = '') {
  const { projectId } = getConfig()
  return `/api/projects/${projectId}${path}`
}

function issuePath(issueId: string, path = '') {
  return projectPath(`/issues/${issueId}${path}`)
}

// --- Project ---

export function getProject() {
  return request<unknown>('GET', projectPath())
}

// --- Issues ---

export function listIssues(closed = false) {
  const qs = closed ? '?closed=true' : ''
  return request<unknown[]>('GET', projectPath(`/issues${qs}`))
}

export function getIssue(issueId: string) {
  return request<unknown>('GET', issuePath(issueId))
}

export function createIssue(title: string) {
  return request<unknown>('POST', projectPath('/issues'), { title })
}

export function closeIssue(issueId: string) {
  return request<unknown>('POST', issuePath(issueId, '/close'))
}

// --- Tasks ---

export function getTasks(issueId: string) {
  return request<unknown[]>('GET', issuePath(issueId, '/tasks'))
}

export function createTask(
  issueId: string,
  data: {
    name: string
    note?: string | null
    parentTaskId?: string | null
    position?: number
  },
) {
  return request<unknown>('POST', issuePath(issueId, '/tasks'), data)
}

export function updateTask(
  issueId: string,
  taskId: string,
  data: { name?: string; note?: string | null; done?: boolean },
) {
  return request<unknown>('PATCH', issuePath(issueId, `/tasks/${taskId}`), data)
}

// --- Notes ---

export function getNotes(issueId: string) {
  return request<unknown[]>('GET', issuePath(issueId, '/notes'))
}

// --- Logs ---

export function getLogs(issueId: string) {
  return request<unknown[]>('GET', issuePath(issueId, '/logs'))
}

export function createLog(issueId: string, content: string) {
  return request<unknown>('POST', issuePath(issueId, '/logs'), { content })
}
