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

  private projectPath(projectSlug: string, suffix = '') {
    return `/api/projects/${projectSlug}${suffix}`
  }

  private issuePath(
    projectSlug: string,
    issueNumber: number | string,
    suffix = '',
  ) {
    return this.projectPath(projectSlug, `/issues/${issueNumber}${suffix}`)
  }

  private skillSetPath(projectSlug: string, slug: string, suffix = '') {
    return this.projectPath(
      projectSlug,
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

  getProject(projectSlug: string): Promise<Project> {
    return this.request('GET', this.projectPath(projectSlug))
  }

  updateProject(
    projectSlug: string,
    input: { name?: string; description?: string },
  ): Promise<Project> {
    return this.request('PATCH', this.projectPath(projectSlug), input)
  }

  // ---- Issues ----

  listIssues(
    projectSlug: string,
    opts?: { closed?: boolean },
  ): Promise<IssueListItem[]> {
    const qs = opts?.closed ? '?closed=true' : ''
    return this.request('GET', this.projectPath(projectSlug, `/issues${qs}`))
  }

  getIssue(
    projectSlug: string,
    issueNumber: number | string,
  ): Promise<IssueDetail> {
    return this.request('GET', this.issuePath(projectSlug, issueNumber))
  }

  createIssue(projectSlug: string, input: { title: string }): Promise<Issue> {
    return this.request('POST', this.projectPath(projectSlug, '/issues'), input)
  }

  updateIssue(
    projectSlug: string,
    issueNumber: number | string,
    input: { title: string },
  ): Promise<Issue> {
    return this.request(
      'PATCH',
      this.issuePath(projectSlug, issueNumber),
      input,
    )
  }

  deleteIssue(
    projectSlug: string,
    issueNumber: number | string,
  ): Promise<void> {
    return this.request('DELETE', this.issuePath(projectSlug, issueNumber))
  }

  closeIssue(projectSlug: string, issueNumber: number | string): Promise<void> {
    return this.request(
      'POST',
      this.issuePath(projectSlug, issueNumber, '/close'),
    )
  }

  reopenIssue(
    projectSlug: string,
    issueNumber: number | string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectSlug, issueNumber, '/close'),
    )
  }

  // ---- Tasks ----

  listTasks(
    projectSlug: string,
    issueNumber: number | string,
  ): Promise<Task[]> {
    return this.request(
      'GET',
      this.issuePath(projectSlug, issueNumber, '/tasks'),
    )
  }

  createTask(
    projectSlug: string,
    issueNumber: number | string,
    input: CreateTaskInput,
  ): Promise<Task> {
    return this.request(
      'POST',
      this.issuePath(projectSlug, issueNumber, '/tasks'),
      input,
    )
  }

  updateTask(
    projectSlug: string,
    issueNumber: number | string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    return this.request(
      'PATCH',
      this.issuePath(projectSlug, issueNumber, `/tasks/${taskId}`),
      input,
    )
  }

  deleteTask(
    projectSlug: string,
    issueNumber: number | string,
    taskId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectSlug, issueNumber, `/tasks/${taskId}`),
    )
  }

  moveTask(
    projectSlug: string,
    issueNumber: number | string,
    taskId: string,
    input: MoveTaskInput,
  ): Promise<Task> {
    return this.request(
      'POST',
      this.issuePath(projectSlug, issueNumber, `/tasks/${taskId}/move`),
      input,
    )
  }

  // ---- Notes ----

  listNotes(
    projectSlug: string,
    issueNumber: number | string,
  ): Promise<Note[]> {
    return this.request(
      'GET',
      this.issuePath(projectSlug, issueNumber, '/notes'),
    )
  }

  createNote(
    projectSlug: string,
    issueNumber: number | string,
    input: { name: string; content: string },
  ): Promise<Note> {
    return this.request(
      'POST',
      this.issuePath(projectSlug, issueNumber, '/notes'),
      input,
    )
  }

  updateNote(
    projectSlug: string,
    issueNumber: number | string,
    noteName: string,
    input: { name?: string; content?: string },
  ): Promise<Note> {
    return this.request(
      'PATCH',
      this.issuePath(
        projectSlug,
        issueNumber,
        `/notes/${encodeURIComponent(noteName)}`,
      ),
      input,
    )
  }

  deleteNote(
    projectSlug: string,
    issueNumber: number | string,
    noteName: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(
        projectSlug,
        issueNumber,
        `/notes/${encodeURIComponent(noteName)}`,
      ),
    )
  }

  // ---- Logs ----

  listLogs(projectSlug: string, issueNumber: number | string): Promise<Log[]> {
    return this.request(
      'GET',
      this.issuePath(projectSlug, issueNumber, '/logs'),
    )
  }

  createLog(
    projectSlug: string,
    issueNumber: number | string,
    input: { content: string },
  ): Promise<Log> {
    return this.request(
      'POST',
      this.issuePath(projectSlug, issueNumber, '/logs'),
      input,
    )
  }

  deleteLog(
    projectSlug: string,
    issueNumber: number | string,
    logId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectSlug, issueNumber, `/logs/${logId}`),
    )
  }

  // ---- Skill Sets ----

  listSkillSets(projectSlug: string): Promise<SkillSetSummary[]> {
    return this.request('GET', this.projectPath(projectSlug, '/skill-sets'))
  }

  getSkillSet(projectSlug: string, slug: string): Promise<SkillSetSummary> {
    return this.request('GET', this.skillSetPath(projectSlug, slug))
  }

  createSkillSet(
    projectSlug: string,
    input: { name: string; slug: string },
  ): Promise<{ id: string }> {
    return this.request(
      'POST',
      this.projectPath(projectSlug, '/skill-sets'),
      input,
    )
  }

  updateSkillSet(
    projectSlug: string,
    slug: string,
    input: { name?: string; slug?: string },
  ): Promise<SkillSetSummary> {
    return this.request('PATCH', this.skillSetPath(projectSlug, slug), input)
  }

  deleteSkillSet(projectSlug: string, slug: string): Promise<void> {
    return this.request('DELETE', this.skillSetPath(projectSlug, slug))
  }

  // ---- Skills ----

  listSkills(
    projectSlug: string,
    skillSetSlug: string,
  ): Promise<SkillSummary[]> {
    return this.request(
      'GET',
      this.skillSetPath(projectSlug, skillSetSlug, '/skills'),
    )
  }

  getSkill(
    projectSlug: string,
    skillSetSlug: string,
    name: string,
  ): Promise<Skill> {
    return this.request(
      'GET',
      this.skillSetPath(
        projectSlug,
        skillSetSlug,
        `/skills/${encodeURIComponent(name)}`,
      ),
    )
  }

  upsertSkill(
    projectSlug: string,
    skillSetSlug: string,
    name: string,
    input: { content: string },
  ): Promise<{ id: string; currentRevisionId: string }> {
    return this.request(
      'PUT',
      this.skillSetPath(
        projectSlug,
        skillSetSlug,
        `/skills/${encodeURIComponent(name)}`,
      ),
      input,
    )
  }

  deleteSkill(
    projectSlug: string,
    skillSetSlug: string,
    name: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.skillSetPath(
        projectSlug,
        skillSetSlug,
        `/skills/${encodeURIComponent(name)}`,
      ),
    )
  }

  // ---- Workers ----

  listWorkers(projectSlug: string): Promise<Worker[]> {
    return this.request('GET', this.projectPath(projectSlug, '/workers'))
  }

  getWorker(projectSlug: string, workerId: string): Promise<Worker> {
    return this.request(
      'GET',
      this.projectPath(projectSlug, `/workers/${workerId}`),
    )
  }

  listWorkerTokens(
    projectSlug: string,
    workerId: string,
  ): Promise<WorkerToken[]> {
    return this.request(
      'GET',
      this.projectPath(projectSlug, `/workers/${workerId}/tokens`),
    )
  }

  createWorkerToken(
    projectSlug: string,
    workerId: string,
    input: { name: string },
  ): Promise<CreateWorkerTokenResult> {
    return this.request(
      'POST',
      this.projectPath(projectSlug, `/workers/${workerId}/tokens`),
      input,
    )
  }

  deleteWorkerToken(
    projectSlug: string,
    workerId: string,
    tokenId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.projectPath(projectSlug, `/workers/${workerId}/tokens/${tokenId}`),
    )
  }
}
