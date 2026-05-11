import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { uuidV7IdColumn } from '../schema-helpers'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { users } from './users'
import { projectOperators } from './project-operators'

export const projectInvites = pgTable('project_invites', {
  id: uuidV7IdColumn(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'claimed' | 'accepted' | 'rejected'
  claimerUserId: uuid('claimer_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  inviterProjectOperatorId: uuid('inviter_project_operator_id').references(
    () => projectOperators.id,
    { onDelete: 'set null' },
  ),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const projectInvitesRelations = relations(projectInvites, ({ one }) => ({
  project: one(projects, {
    fields: [projectInvites.projectId],
    references: [projects.id],
  }),
  claimerUser: one(users, {
    fields: [projectInvites.claimerUserId],
    references: [users.id],
  }),
  inviterProjectOperator: one(projectOperators, {
    fields: [projectInvites.inviterProjectOperatorId],
    references: [projectOperators.id],
  }),
}))
