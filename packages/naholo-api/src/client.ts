import type {
  AgentTranscriptPayload,
  AgentTranscriptSummary,
  AuthUser,
  CreateTaskInput,
  Operation,
  OperationDetail,
  OperationListItem,
  OperationLog,
  MoveTaskInput,
  Note,
  Project,
  ProjectWithOperator,
  Task,
  SyncTasksInput,
  SyncTasksResult,
  UpdateTaskInput,
  Operator,
} from './types.js'

export class NaholoClient {
  public baseUrl: string
  private token: string

  constructor(options: { baseUrl: string; token: string }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.token = options.token
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${method} ${path} failed (${res.status}): ${text}`)
    }

    if (res.status === 204) {
      return undefined as T
    }

    return res.json() as Promise<T>
  }

  private projectPath(projectSlug: string, suffix = '') {
    return `/api/projects/${projectSlug}${suffix}`
  }

  private operationPath(
    projectSlug: string,
    operationNumber: number | string,
    suffix = '',
  ) {
    return this.projectPath(
      projectSlug,
      `/operations/${operationNumber}${suffix}`,
    )
  }

  // ---- Auth ----

  getAuthUser(): Promise<AuthUser> {
    return this.request('GET', '/api/auth/user')
  }

  // ---- Projects ----

  listProjects(opts: {
    with: 'projectOperatorOfCurrentUser'
  }): Promise<ProjectWithOperator[]>
  listProjects(opts?: undefined): Promise<Project[]>
  listProjects(opts?: {
    with?: 'projectOperatorOfCurrentUser'
  }): Promise<Project[] | ProjectWithOperator[]> {
    const qs = opts?.with != null ? `?with=${opts.with}` : ''
    return this.request('GET', `/api/projects${qs}`)
  }

  getProject(projectSlug: string): Promise<Project> {
    return this.request('GET', this.projectPath(projectSlug))
  }

  updateProject(
    projectSlug: string,
    input: { name?: string; description?: string },
  ): Promise<Project> {
    return this.request('PATCH', this.projectPath(projectSlug), input)
  }

  // ---- Operations ----

  listOperations(
    projectSlug: string,
    opts?: { closed?: boolean },
  ): Promise<OperationListItem[]> {
    const qs = opts?.closed ? '?closed=true' : ''
    return this.request(
      'GET',
      this.projectPath(projectSlug, `/operations${qs}`),
    )
  }

  getOperation(
    projectSlug: string,
    operationNumber: number | string,
  ): Promise<OperationDetail> {
    return this.request('GET', this.operationPath(projectSlug, operationNumber))
  }

  createOperationAssignees(
    projectSlug: string,
    operationNumber: number | string,
    targets: string[],
  ): Promise<{ success: true }> {
    return this.request(
      'POST',
      this.operationPath(projectSlug, operationNumber, '/assignees'),
      { targets },
    )
  }

  deleteOperationAssignees(
    projectSlug: string,
    operationNumber: number | string,
    targets: string[],
  ): Promise<{ success: true }> {
    return this.request(
      'DELETE',
      this.operationPath(projectSlug, operationNumber, '/assignees'),
      { targets },
    )
  }

  createOperation(
    projectSlug: string,
    input: { title: string },
  ): Promise<Operation> {
    return this.request(
      'POST',
      this.projectPath(projectSlug, '/operations'),
      input,
    )
  }

  updateOperation(
    projectSlug: string,
    operationNumber: number | string,
    input: { title: string },
  ): Promise<Operation> {
    return this.request(
      'PATCH',
      this.operationPath(projectSlug, operationNumber),
      input,
    )
  }

  deleteOperation(
    projectSlug: string,
    operationNumber: number | string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.operationPath(projectSlug, operationNumber),
    )
  }

  closeOperation(
    projectSlug: string,
    operationNumber: number | string,
  ): Promise<void> {
    return this.request(
      'POST',
      this.operationPath(projectSlug, operationNumber, '/close'),
    )
  }

  reopenOperation(
    projectSlug: string,
    operationNumber: number | string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.operationPath(projectSlug, operationNumber, '/close'),
    )
  }

  // ---- Tasks ----

  listTasks(
    projectSlug: string,
    operationNumber: number | string,
  ): Promise<Task[]> {
    return this.request(
      'GET',
      this.operationPath(projectSlug, operationNumber, '/tasks'),
    )
  }

  createTask(
    projectSlug: string,
    operationNumber: number | string,
    input: CreateTaskInput,
  ): Promise<Task> {
    return this.request(
      'POST',
      this.operationPath(projectSlug, operationNumber, '/tasks'),
      input,
    )
  }

  updateTask(
    projectSlug: string,
    operationNumber: number | string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    return this.request(
      'PATCH',
      this.operationPath(projectSlug, operationNumber, `/tasks/${taskId}`),
      input,
    )
  }

  deleteTask(
    projectSlug: string,
    operationNumber: number | string,
    taskId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.operationPath(projectSlug, operationNumber, `/tasks/${taskId}`),
    )
  }

  moveTask(
    projectSlug: string,
    operationNumber: number | string,
    taskId: string,
    input: MoveTaskInput,
  ): Promise<Task> {
    return this.request(
      'POST',
      this.operationPath(projectSlug, operationNumber, `/tasks/${taskId}/move`),
      input,
    )
  }

  syncTasks(
    projectSlug: string,
    operationNumber: number | string,
    input: SyncTasksInput,
  ): Promise<SyncTasksResult> {
    return this.request(
      'PUT',
      this.operationPath(projectSlug, operationNumber, '/tasks'),
      input,
    )
  }

  // ---- Notes ----

  listNotes(
    projectSlug: string,
    operationNumber: number | string,
  ): Promise<Note[]> {
    return this.request(
      'GET',
      this.operationPath(projectSlug, operationNumber, '/notes'),
    )
  }

  createNote(
    projectSlug: string,
    operationNumber: number | string,
    input: { name: string; content: string },
  ): Promise<Note> {
    return this.request(
      'POST',
      this.operationPath(projectSlug, operationNumber, '/notes'),
      input,
    )
  }

  updateNote(
    projectSlug: string,
    operationNumber: number | string,
    noteName: string,
    input: { name?: string; content?: string },
  ): Promise<Note> {
    return this.request(
      'PATCH',
      this.operationPath(
        projectSlug,
        operationNumber,
        `/notes/${encodeURIComponent(noteName)}`,
      ),
      input,
    )
  }

  deleteNote(
    projectSlug: string,
    operationNumber: number | string,
    noteName: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.operationPath(
        projectSlug,
        operationNumber,
        `/notes/${encodeURIComponent(noteName)}`,
      ),
    )
  }

  // ---- Operation Logs ----

  listOperationLogs(
    projectSlug: string,
    operationNumber: number | string,
  ): Promise<OperationLog[]> {
    return this.request(
      'GET',
      this.operationPath(projectSlug, operationNumber, '/logs'),
    )
  }

  createOperationLog(
    projectSlug: string,
    operationNumber: number | string,
    input: { content: string },
  ): Promise<OperationLog> {
    return this.request(
      'POST',
      this.operationPath(projectSlug, operationNumber, '/logs'),
      input,
    )
  }

  deleteOperationLog(
    projectSlug: string,
    operationNumber: number | string,
    logId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.operationPath(projectSlug, operationNumber, `/logs/${logId}`),
    )
  }

  // ---- Agent Transcripts ----

  recordAgentTranscript(
    projectSlug: string,
    operationNumber: number | string,
    transcriptId: string,
    payload: AgentTranscriptPayload,
  ): Promise<{ id: string }> {
    return this.request(
      'PUT',
      this.operationPath(
        projectSlug,
        operationNumber,
        `/agent-transcripts/${transcriptId}`,
      ),
      payload,
    )
  }

  listAgentTranscripts(
    projectSlug: string,
    operationNumber: number | string,
  ): Promise<AgentTranscriptSummary[]> {
    return this.request(
      'GET',
      this.operationPath(projectSlug, operationNumber, '/agent-transcripts'),
    )
  }

  async getAgentTranscriptBody(
    projectSlug: string,
    operationNumber: number | string,
    transcriptId: string,
  ): Promise<string> {
    const path = this.operationPath(
      projectSlug,
      operationNumber,
      `/agent-transcripts/${transcriptId}/transcript`,
    )
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GET ${path} failed (${res.status}): ${text}`)
    }
    return await res.text()
  }

  // ---- Operators ----

  listOperators(projectSlug: string): Promise<Operator[]> {
    return this.request('GET', this.projectPath(projectSlug, '/operators'))
  }

  getOperator(projectSlug: string, operatorId: string): Promise<Operator> {
    return this.request(
      'GET',
      this.projectPath(projectSlug, `/operators/${operatorId}`),
    )
  }
}
