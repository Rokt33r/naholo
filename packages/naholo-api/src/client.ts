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

  private issuePath(projectId: string, issueId: string, suffix = '') {
    return this.projectPath(projectId, `/issues/${issueId}${suffix}`)
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

  listProjects(): Promise<ProjectWithWorker[]> {
    return this.request('GET', '/api/projects')
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

  getIssue(projectId: string, issueId: string): Promise<IssueDetail> {
    return this.request('GET', this.issuePath(projectId, issueId))
  }

  createIssue(projectId: string, input: { title: string }): Promise<Issue> {
    return this.request('POST', this.projectPath(projectId, '/issues'), input)
  }

  updateIssue(
    projectId: string,
    issueId: string,
    input: { title: string },
  ): Promise<Issue> {
    return this.request('PATCH', this.issuePath(projectId, issueId), input)
  }

  deleteIssue(projectId: string, issueId: string): Promise<void> {
    return this.request('DELETE', this.issuePath(projectId, issueId))
  }

  closeIssue(projectId: string, issueId: string): Promise<void> {
    return this.request('POST', this.issuePath(projectId, issueId, '/close'))
  }

  reopenIssue(projectId: string, issueId: string): Promise<void> {
    return this.request('DELETE', this.issuePath(projectId, issueId, '/close'))
  }

  // ---- Tasks ----

  listTasks(projectId: string, issueId: string): Promise<Task[]> {
    return this.request('GET', this.issuePath(projectId, issueId, '/tasks'))
  }

  createTask(
    projectId: string,
    issueId: string,
    input: CreateTaskInput,
  ): Promise<Task> {
    return this.request(
      'POST',
      this.issuePath(projectId, issueId, '/tasks'),
      input,
    )
  }

  updateTask(
    projectId: string,
    issueId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    return this.request(
      'PATCH',
      this.issuePath(projectId, issueId, `/tasks/${taskId}`),
      input,
    )
  }

  deleteTask(
    projectId: string,
    issueId: string,
    taskId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectId, issueId, `/tasks/${taskId}`),
    )
  }

  moveTask(
    projectId: string,
    issueId: string,
    taskId: string,
    input: MoveTaskInput,
  ): Promise<Task> {
    return this.request(
      'POST',
      this.issuePath(projectId, issueId, `/tasks/${taskId}/move`),
      input,
    )
  }

  // ---- Notes ----

  listNotes(projectId: string, issueId: string): Promise<Note[]> {
    return this.request('GET', this.issuePath(projectId, issueId, '/notes'))
  }

  createNote(
    projectId: string,
    issueId: string,
    input: { title: string; content: string },
  ): Promise<Note> {
    return this.request(
      'POST',
      this.issuePath(projectId, issueId, '/notes'),
      input,
    )
  }

  updateNote(
    projectId: string,
    issueId: string,
    noteId: string,
    input: { title?: string; content?: string },
  ): Promise<Note> {
    return this.request(
      'PATCH',
      this.issuePath(projectId, issueId, `/notes/${noteId}`),
      input,
    )
  }

  deleteNote(
    projectId: string,
    issueId: string,
    noteId: string,
  ): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectId, issueId, `/notes/${noteId}`),
    )
  }

  // ---- Logs ----

  listLogs(projectId: string, issueId: string): Promise<Log[]> {
    return this.request('GET', this.issuePath(projectId, issueId, '/logs'))
  }

  createLog(
    projectId: string,
    issueId: string,
    input: { content: string },
  ): Promise<Log> {
    return this.request(
      'POST',
      this.issuePath(projectId, issueId, '/logs'),
      input,
    )
  }

  deleteLog(projectId: string, issueId: string, logId: string): Promise<void> {
    return this.request(
      'DELETE',
      this.issuePath(projectId, issueId, `/logs/${logId}`),
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
