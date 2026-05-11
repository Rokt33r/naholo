import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { operations } from './operations'
import { projects } from './projects'
import { projectOperators } from './project-operators'
import { operationNoteRevisions } from './operation-note-revisions'

export const operationNotes = pgTable(
  'operation_notes',
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
    name: text('name').notNull(),
    content: text('content').notNull(), // markdown content
    currentRevisionId: uuid('current_revision_id'),
    position: integer('position').notNull().default(0), // for tab ordering
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('operation_notes_operation_id_name_idx').on(
      table.operationId,
      table.name,
    ),
  ],
)

export const operationNotesRelations = relations(
  operationNotes,
  ({ one, many }) => ({
    operation: one(operations, {
      fields: [operationNotes.operationId],
      references: [operations.id],
    }),
    currentRevision: one(operationNoteRevisions, {
      fields: [operationNotes.currentRevisionId],
      references: [operationNoteRevisions.id],
    }),
    revisions: many(operationNoteRevisions),
  }),
)
