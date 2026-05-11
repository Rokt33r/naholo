import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { operations } from './operations'
import { projects } from './projects'
import { projectOperators } from './project-operators'

export const operationAgentSessions = pgTable('operation_agent_sessions', {
  id: uuidV7IdColumn(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  operationId: uuid('operation_id')
    .notNull()
    .references(() => operations.id, { onDelete: 'cascade' }),
  projectOperatorId: uuid('project_operator_id').references(
    () => projectOperators.id,
    { onDelete: 'set null' },
  ),
  sessionId: text('session_id').notNull().unique(),
  title: text('title'),
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at').notNull(),
  hasTranscript: boolean('has_transcript').notNull().default(false),
  transcriptSizeBytes: integer('transcript_size_bytes').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const operationAgentSessionsRelations = relations(
  operationAgentSessions,
  ({ one }) => ({
    project: one(projects, {
      fields: [operationAgentSessions.projectId],
      references: [projects.id],
    }),
    operation: one(operations, {
      fields: [operationAgentSessions.operationId],
      references: [operations.id],
    }),
    projectOperator: one(projectOperators, {
      fields: [operationAgentSessions.projectOperatorId],
      references: [projectOperators.id],
    }),
  }),
)
