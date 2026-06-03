import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'
import type {
  AgentTranscriptStatsV1,
  AgentTranscriptStatsError,
} from 'naholo-agent-transcript-stats/claude-code'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { operations } from './operations'
import { projects } from './projects'
import { projectOperators } from './project-operators'

export const operationAgentTranscripts = pgTable(
  'operation_agent_transcripts',
  {
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
    transcriptId: text('transcript_id').notNull(),
    title: text('title'),
    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at').notNull(),
    hasTranscript: boolean('has_transcript').notNull().default(false),
    transcriptSizeBytes: integer('transcript_size_bytes').notNull(),
    stats: jsonb('stats').$type<AgentTranscriptStatsV1>(),
    statsFormat: text('stats_format').$type<'claude-code-v1'>(),
    statsError: jsonb('stats_error').$type<AgentTranscriptStatsError[]>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique('operation_agent_transcripts_operation_id_transcript_id').on(
      table.operationId,
      table.transcriptId,
    ),
  ],
)

export const operationAgentTranscriptsRelations = relations(
  operationAgentTranscripts,
  ({ one }) => ({
    project: one(projects, {
      fields: [operationAgentTranscripts.projectId],
      references: [projects.id],
    }),
    operation: one(operations, {
      fields: [operationAgentTranscripts.operationId],
      references: [operations.id],
    }),
    projectOperator: one(projectOperators, {
      fields: [operationAgentTranscripts.projectOperatorId],
      references: [projectOperators.id],
    }),
  }),
)
