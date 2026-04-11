import type {
  AuthUser,
  CreateTaskInput,
  CreateWorkerTokenResult,
  Issue,
  IssueDetail,
  IssueListItem,
  Log,
  MoveTaskInput,
  Note,
  Project,
  ProjectWithWorker,
  Skill,
  SkillSetSummary,
  SkillSummary,
  Task,
  UpdateTaskInput,
  Worker,
  WorkerToken,
} from './types.js'

export class NaholoClient {
  private baseUrl: string
  private token: string
  private projectWorkerId: string | undefined

  constructor(options: {
    baseUrl: string
    token: string
    projectWorkerId?: string
  }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.token = options.token
    this.projectWorkerId = options.projectWorkerId
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
    if (this.projectWorkerId != null) {
      headers['x-naholo-project-worker'] = this.projectWorkerId
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

  private projectPath(projectId: string, suffix = '') {
    return `/api/projects/${projectId}${suffix}`
  }

  private issuePath(
    projectId: string,
    issueNumber: number | string,
    suffix = '',
  ) {
    return this.projectPath(projectId, `/issues/${issueNumber}${suffix}`)
  }

  private skillSetPath(projectId: string, slug: string, suffix = '') {
    return this.projectPath(
      projectId,
      `/skill-sets/${encodeURIComponent(slug)}${suffix}`,
    )
  }

  // ---- Auth ----

  getAuthUser(): Promise<AuthUser> {
    return this.request('GET', '/api/auth/user')
  }

  // ---- Projects ----

  listProjects(opts: {
    with: 'projectWorkerOfCurrentUser'
  }): Promise<ProjectWithWorker[]>
  listProjects(opts?: undefined): Promise<Project[]>
  listProjects(opts?: {
    with?: 'projectWorkerOfCurrentUser'
  }): Promise<Project[] | ProjectWithWorker[]> {
    const qs = opts?.with != null ? `?with=${opts.with}` : ''
    return this.request('GET', `/api/projects${qs}`)
  }

  getProject(projectId: string): Promise<Project> {
    return this.request('GET', this.projectPath(projectId))
  }

  updateProject(
    projectId: string,
    input: { name?: string; description?: string },
  ): Promise<Project> {
    return this.request('PATCH', this.projectPath(projectId), input)
  }

  // ---- Issues ----

  listIssues(
    projectId: string,
    opts?: { closed?: boolean },
  ): Promise<IssueListItem[]> {
    const qs = opts?.closed ? '?closed=true' : ''
    return this.request('GET', this.projectPath(projectId, `/issues${qs}`))
  }

  getIssue(
    projectId: string,
    issueNumber: number | string,
  ): Promise<IssueDetail> {
    return this.request('GET', this.issuePath(projectId, issueNumber))
  }

  createIssue(projectId: string, input: { title: string }): Promise<Issue> {
    return this.request('POST', this.projectPath(projectId, '/issues'), input)
  }

  updateIssue(
    projectId: string,
    issueNumber: number | string,
    input: { title: string },
  ): Promise<Issue> {
    return this.request('PATCH', this.issuePath(projectId, issueNumber), input)
  }

  deleteIssue(projectId: string, issueNumber: number | string): Promise<void> {
    return this.request('DELETE', this.issuePath(projectId, issueNumber))
  }

  closeIssue(projectId: string, issueNumber: number | string): Promise<void> {
    return this.request(
      'POST',
      this.issuePath(projectId, issueNumber, '/close'),
    )
  }

  reopenIssue(projectId: string, issueNumber: number | string): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectId, issueNumber, '/close'),
    )
  }

  // ---- Tasks ----

  listTasks(projectId: string, issueNumber: number | string): Promise<Task[]> {
    return this.request('GET', this.issuePath(projectId, issueNumber, '/tasks'))
  }

  createTask(
    projectId: string,
    issueNumber: number | string,
    input: CreateTaskInput,
  ): Promise<Task> {
    return this.request(
      'POST',
      this.issuePath(projectId, issueNumber, '/tasks'),
      input,
    )
  }

  updateTask(
    projectId: string,
    issueNumber: number | string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    return this.request(
      'PATCH',
      this.issuePath(projectId, issueNumber, `/tasks/${taskId}`),
      input,
    )
  }

  deleteTask(
    projectId: string,
    issueNumber: number | string,
    taskId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectId, issueNumber, `/tasks/${taskId}`),
    )
  }

  moveTask(
    projectId: string,
    issueNumber: number | string,
    taskId: string,
    input: MoveTaskInput,
  ): Promise<Task> {
    return this.request(
      'POST',
      this.issuePath(projectId, issueNumber, `/tasks/${taskId}/move`),
      input,
    )
  }

  // ---- Notes ----

  listNotes(projectId: string, issueNumber: number | string): Promise<Note[]> {
    return this.request('GET', this.issuePath(projectId, issueNumber, '/notes'))
  }

  createNote(
    projectId: string,
    issueNumber: number | string,
    input: { title: string; content: string },
  ): Promise<Note> {
    return this.request(
      'POST',
      this.issuePath(projectId, issueNumber, '/notes'),
      input,
    )
  }

  updateNote(
    projectId: string,
    issueNumber: number | string,
    noteId: string,
    input: { title?: string; content?: string },
  ): Promise<Note> {
    return this.request(
      'PATCH',
      this.issuePath(projectId, issueNumber, `/notes/${noteId}`),
      input,
    )
  }

  deleteNote(
    projectId: string,
    issueNumber: number | string,
    noteId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectId, issueNumber, `/notes/${noteId}`),
    )
  }

  // ---- Logs ----

  listLogs(projectId: string, issueNumber: number | string): Promise<Log[]> {
    return this.request('GET', this.issuePath(projectId, issueNumber, '/logs'))
  }

  createLog(
    projectId: string,
    issueNumber: number | string,
    input: { content: string },
  ): Promise<Log> {
    return this.request(
      'POST',
      this.issuePath(projectId, issueNumber, '/logs'),
      input,
    )
  }

  deleteLog(
    projectId: string,
    issueNumber: number | string,
    logId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectId, issueNumber, `/logs/${logId}`),
    )
  }

  // ---- Skill Sets ----

  listSkillSets(projectId: string): Promise<SkillSetSummary[]> {
    return this.request('GET', this.projectPath(projectId, '/skill-sets'))
  }

  getSkillSet(projectId: string, slug: string): Promise<SkillSetSummary> {
    return this.request('GET', this.skillSetPath(projectId, slug))
  }

  createSkillSet(
    projectId: string,
    input: { name: string; slug: string },
  ): Promise<{ id: string }> {
    return this.request(
      'POST',
      this.projectPath(projectId, '/skill-sets'),
      input,
    )
  }

  updateSkillSet(
    projectId: string,
    slug: string,
    input: { name?: string; slug?: string },
  ): Promise<SkillSetSummary> {
    return this.request('PATCH', this.skillSetPath(projectId, slug), input)
  }

  deleteSkillSet(projectId: string, slug: string): Promise<void> {
    return this.request('DELETE', this.skillSetPath(projectId, slug))
  }

  // ---- Skills ----

  listSkills(projectId: string, skillSetSlug: string): Promise<SkillSummary[]> {
    return this.request(
      'GET',
      this.skillSetPath(projectId, skillSetSlug, '/skills'),
    )
  }

  getSkill(
    projectId: string,
    skillSetSlug: string,
    name: string,
  ): Promise<Skill> {
    return this.request(
      'GET',
      this.skillSetPath(
        projectId,
        skillSetSlug,
        `/skills/${encodeURIComponent(name)}`,
      ),
    )
  }

  upsertSkill(
    projectId: string,
    skillSetSlug: string,
    name: string,
    input: { content: string },
  ): Promise<{ id: string; currentRevisionId: string }> {
    return this.request(
      'PUT',
      this.skillSetPath(
        projectId,
        skillSetSlug,
        `/skills/${encodeURIComponent(name)}`,
      ),
      input,
    )
  }

  deleteSkill(
    projectId: string,
    skillSetSlug: string,
    name: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.skillSetPath(
        projectId,
        skillSetSlug,
        `/skills/${encodeURIComponent(name)}`,
      ),
    )
  }

  // ---- Workers ----

  listWorkers(projectId: string): Promise<Worker[]> {
    return this.request('GET', this.projectPath(projectId, '/workers'))
  }

  getWorker(projectId: string, workerId: string): Promise<Worker> {
    return this.request(
      'GET',
      this.projectPath(projectId, `/workers/${workerId}`),
    )
  }

  listWorkerTokens(
    projectId: string,
    workerId: string,
  ): Promise<WorkerToken[]> {
    return this.request(
      'GET',
      this.projectPath(projectId, `/workers/${workerId}/tokens`),
    )
  }

  createWorkerToken(
    projectId: string,
    workerId: string,
    input: { name: string },
  ): Promise<CreateWorkerTokenResult> {
    return this.request(
      'POST',
      this.projectPath(projectId, `/workers/${workerId}/tokens`),
      input,
    )
  }

  deleteWorkerToken(
    projectId: string,
    workerId: string,
    tokenId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.projectPath(projectId, `/workers/${workerId}/tokens/${tokenId}`),
    )
  }
}
