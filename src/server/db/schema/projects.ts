import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'
import { projectWorkers } from './project-workers'
import { skillSets } from './skill-sets'

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  issueCounter: integer('issue_counter').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const projectsRelations = relations(projects, ({ many }) => ({
  projectWorkers: many(projectWorkers),
  skillSets: many(skillSets),
}))
