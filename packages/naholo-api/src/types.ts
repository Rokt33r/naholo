// ---- Project ----

export type Project = {
  id: string
  slug: string
  name: string
  description: string | null
  createdAt: string
}

export type ProjectOperatorInfo = {
  id: string
  name: string
  role: string
}

export type ProjectWithOperator = Project & {
  projectOperatorOfCurrentUser: ProjectOperatorInfo
}

// ---- Operation ----

export type Operation = {
  id: string
  projectId: string
  number: number
  title: string
  closed: boolean
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export type OperationListItem = {
  id: string
  number: number
  title: string
  closed: boolean
  closedAt: string | null
  updatedAt: string
  lastOperationLogPreview: string | null
  totalTasks: number
  completedTasks: number
}

export type OperationDetail = Pick<
  Operation,
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

export type SyncTaskNode = {
  id?: string
  name: string
  done?: boolean
  childTasks?: SyncTaskNode[]
}

export type SyncTasksInput = {
  tasks: SyncTaskNode[]
  taskIdsToDelete?: string[]
}

export type SyncTasksResult = {
  created: { id: string; name: string }[]
}

// ---- Note ----

export type Note = {
  id: string
  name: string
  content: string
  currentRevisionId: string | null
  position: number
  createdAt: string
  updatedAt: string
}

// ---- Operation Log ----

export type OperationLog = {
  id: string
  content: string
  projectOperator: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

// ---- Operator ----

export type Operator = {
  id: string
  projectId: string
  userId: string | null
  name: string
  role: string
  createdAt: string
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

// ---- Agent transcripts ----

import type { AgentTranscriptStatsV1 } from 'naholo-agent-transcripts/claude-code'

export type AgentTranscriptSummary = {
  id: string
  transcriptId: string
  title: string | null
  startedAt: string // ISO 8601
  endedAt: string // ISO 8601
  hasTranscript: boolean
  transcriptSizeBytes: number
  stats: AgentTranscriptStatsV1 | null
  statsFormat: 'claude-code-v1' | null
  statsErrored: boolean
}

export type AgentTranscriptPayload = {
  title: string | null
  startedAt: string // ISO 8601
  endedAt: string // ISO 8601
  // null = caller is recording the transcript but opting out of body upload;
  // server leaves has_transcript=false and skips the storage write.
  transcript: string | null
}
