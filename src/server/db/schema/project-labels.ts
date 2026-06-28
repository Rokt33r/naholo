import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { operationProjectLabels } from './operation-project-labels'

export const projectLabels = pgTable(
  'project_labels',
  {
    id: uuidV7IdColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_labels_project_id_name_idx').on(
      table.projectId,
      table.name,
    ),
  ],
)

export const projectLabelsRelations = relations(
  projectLabels,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectLabels.projectId],
      references: [projects.id],
    }),
    operationLabels: many(operationProjectLabels),
  }),
)
