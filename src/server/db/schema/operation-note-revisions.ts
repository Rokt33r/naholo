import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { operationNotes } from './operation-notes'

export const operationNoteRevisions = pgTable('operation_note_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  noteId: uuid('note_id')
    .notNull()
    .references(() => operationNotes.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const operationNoteRevisionsRelations = relations(
  operationNoteRevisions,
  ({ one }) => ({
    note: one(operationNotes, {
      fields: [operationNoteRevisions.noteId],
      references: [operationNotes.id],
    }),
  }),
)
