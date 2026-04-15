import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { users } from './users'
import { projectWorkers } from './project-workers'

export const projectInvites = pgTable('project_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'claimed' | 'accepted' | 'rejected'
  claimerUserId: uuid('claimer_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  inviterProjectWorkerId: uuid('inviter_project_worker_id').references(
    () => projectWorkers.id,
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
  inviterProjectWorker: one(projectWorkers, {
    fields: [projectInvites.inviterProjectWorkerId],
    references: [projectWorkers.id],
  }),
}))
