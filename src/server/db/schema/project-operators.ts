import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { users } from './users'

export const projectOperators = pgTable('project_operators', {
  id: uuidV7IdColumn(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const projectOperatorsRelations = relations(
  projectOperators,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectOperators.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectOperators.userId],
      references: [users.id],
    }),
  }),
)
