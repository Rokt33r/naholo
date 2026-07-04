import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations, sql } from 'drizzle-orm'
import { projects } from './projects'
import { users } from './users'
import { operationAssignees } from './operation-assignees'

export const projectOperators = pgTable(
  'project_operators',
  {
    id: uuidV7IdColumn(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    callsign: text('callsign').notNull(),
    role: text('role').notNull().default('member'), // 'admin' | 'member'
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_operators_project_id_callsign_idx').on(
      table.projectId,
      sql`lower(${table.callsign})`,
    ),
  ],
)

export const projectOperatorsRelations = relations(
  projectOperators,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectOperators.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectOperators.userId],
      references: [users.id],
    }),
    assignedOperations: many(operationAssignees),
  }),
)
