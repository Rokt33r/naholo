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
  type: string
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
  totalObjectives: number
  completedObjectives: number
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

// ---- Objective ----

export type Objective = {
  id: string
  parentObjectiveId: string | null
  name: string
  note: string | null
  done: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export type CreateObjectiveInput = {
  name: string
  note?: string | null
  parentObjectiveId?: string | null
  position?: number
}

export type UpdateObjectiveInput = {
  name?: string
  note?: string | null
  done?: boolean
}

export type MoveObjectiveInput = {
  parentObjectiveId?: string | null
  position: number
}

export type SyncObjectiveNode = {
  id?: string
  name: string
  done?: boolean
  childObjectives?: SyncObjectiveNode[]
}

export type SyncObjectivesInput = {
  objectives: SyncObjectiveNode[]
  objectiveIdsToDelete?: string[]
}

export type SyncObjectivesResult = {
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
  projectOperator: { id: string; name: string; type: string } | null
  createdAt: string
  updatedAt: string
}

// ---- Operator ----

export type Operator = {
  id: string
  projectId: string
  userId: string | null
  type: string
  name: string
  role: string
  createdAt: string
}

export type OperatorToken = {
  id: string
  name: string
  tokenHint: string
  lastUsedAt: string | null
  createdAt: string
}

export type CreateOperatorTokenResult = {
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

// ---- Agent sessions ----

export type AgentSessionSummary = {
  id: string
  sessionId: string
  title: string | null
  startedAt: string // ISO 8601
  endedAt: string // ISO 8601
  hasTranscript: boolean
  transcriptSizeBytes: number
}

export type AgentSessionPayload = {
  title: string | null
  startedAt: string // ISO 8601
  endedAt: string // ISO 8601
  // null = caller is recording the session but opting out of transcript upload;
  // server leaves has_transcript=false and skips the storage write.
  transcript: string | null
  transcriptSizeBytes: number
}
