// ---- Project ----

export type Project = {
  id: string
  slug: string
  name: string
  description: string | null
  createdAt: string
}

export type ProjectWorkerInfo = {
  id: string
  type: string
  name: string
  role: string
}

export type ProjectWithWorker = Project & {
  projectWorkerOfCurrentUser: ProjectWorkerInfo
}

// ---- Issue ----

export type Issue = {
  id: string
  projectId: string
  number: number
  title: string
  closed: boolean
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export type IssueListItem = {
  id: string
  number: number
  title: string
  closed: boolean
  closedAt: string | null
  updatedAt: string
  lastLogPreview: string | null
  totalTasks: number
  completedTasks: number
}

export type IssueDetail = Pick<
  Issue,
  | 'id'
  | 'projectId'
  | 'number'
  | 'title'
  | 'closed'
  | 'closedAt'
  | 'createdAt'
  | 'updatedAt'
>

// ---- Task ----

export type Task = {
  id: string
  parentTaskId: string | null
  name: string
  note: string | null
  done: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export type CreateTaskInput = {
  name: string
  note?: string | null
  parentTaskId?: string | null
  position?: number
}

export type UpdateTaskInput = {
  name?: string
  note?: string | null
  done?: boolean
}

export type MoveTaskInput = {
  parentTaskId?: string | null
  position: number
}

// ---- Note ----

export type Note = {
  id: string
  name: string
  content: string
  position: number
  createdAt: string
  updatedAt: string
}

// ---- Log ----

export type Log = {
  id: string
  content: string
  projectWorker: { id: string; name: string; type: string } | null
  createdAt: string
  updatedAt: string
}

// ---- Skill Set ----

export type SkillSetSummary = {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

// ---- Skill ----

export type SkillSummary = {
  id: string
  name: string
  currentRevisionId: string | null
  createdAt: string
  updatedAt: string
}

export type Skill = SkillSummary & {
  content: string
}

// ---- Worker ----

export type Worker = {
  id: string
  projectId: string
  userId: string | null
  type: string
  name: string
  role: string
  createdAt: string
}

export type WorkerToken = {
  id: string
  name: string
  tokenHint: string
  lastUsedAt: string | null
  createdAt: string
}

export type CreateWorkerTokenResult = {
  id: string
  token: string
}

// ---- Auth ----

export type AuthUser = {
  id: string
  email: string
  name: string
}

export type UserApiToken = {
  id: string
  name: string
  tokenHint: string
  lastUsedAt: string | null
  createdAt: string
}
