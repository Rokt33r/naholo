import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { projectOperators } from './project-operators'
import { operationLogs } from './operation-logs'
import { operationNotes } from './operation-notes'
import { operationTasks } from './operation-tasks'
import { operationAgentTranscripts } from './operation-agent-transcripts'

export const operations = pgTable(
  'operations',
  {
    id: uuidV7IdColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    projectOperatorId: uuid('project_operator_id').references(
      () => projectOperators.id,
      { onDelete: 'set null' },
    ),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    lastOperationLogPreview: text('last_operation_log_preview'),
    closed: boolean('closed').notNull().default(false),
    closedAt: timestamp('closed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('operations_project_id_number_idx').on(
      table.projectId,
      table.number,
    ),
  ],
)

export const operationsRelations = relations(operations, ({ one, many }) => ({
  project: one(projects, {
    fields: [operations.projectId],
    references: [projects.id],
  }),
  projectOperator: one(projectOperators, {
    fields: [operations.projectOperatorId],
    references: [projectOperators.id],
  }),
  logs: many(operationLogs),
  notes: many(operationNotes),
  tasks: many(operationTasks),
  agentTranscripts: many(operationAgentTranscripts),
}))
