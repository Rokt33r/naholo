import { cache } from 'react'
import { db } from '@/db'
import { projects, issues, logs, tasks } from '@/db/schema'
import { getAuthUser } from '@/server/auth/utils'
import { eq, and, desc, asc, isNull } from 'drizzle-orm'

/**
 * Get all projects for current user
 */
export const getProjects = cache(async () => {
  const user = await getAuthUser()
  if (!user) return []

  return await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))
})

/**
 * Get a single project
 */
export const getProject = cache(async (projectId: string) => {
  const user = await getAuthUser()
  if (!user) return null

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1)

  return project || null
})

/**
 * Get issues for a project
 * @param closed - true to show closed, false to show open
 */
export const getIssues = cache(
  async (projectId: string, closed: boolean = false) => {
    const user = await getAuthUser()
    if (!user) return []

    return await db
      .select({
        id: issues.id,
        title: issues.title,
        closed: issues.closed,
        closedAt: issues.closedAt,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
      })
      .from(issues)
      .where(
        and(
          eq(issues.projectId, projectId),
          eq(issues.userId, user.id),
          eq(issues.closed, closed),
        ),
      )
      .orderBy(desc(issues.updatedAt))
  },
)

/**
 * Get a single issue
 */
export const getIssue = cache(async (issueId: string) => {
  const user = await getAuthUser()
  if (!user) return null

  const [issue] = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      title: issues.title,
      closed: issues.closed,
      closedAt: issues.closedAt,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .where(and(eq(issues.id, issueId), eq(issues.userId, user.id)))
    .limit(1)

  return issue || null
})

/**
 * Get logs for an issue
 */
export const getLogs = cache(async (issueId: string) => {
  const user = await getAuthUser()
  if (!user) return []

  return await db
    .select({
      id: logs.id,
      content: logs.content,
      createdAt: logs.createdAt,
      updatedAt: logs.updatedAt,
    })
    .from(logs)
    .where(and(eq(logs.issueId, issueId), eq(logs.userId, user.id)))
    .orderBy(asc(logs.createdAt))
})

/**
 * Get tasks for an issue (hierarchical)
 */
export const getTasks = cache(async (issueId: string) => {
  const user = await getAuthUser()
  if (!user) return []

  return await db
    .select({
      id: tasks.id,
      parentTaskId: tasks.parentTaskId,
      content: tasks.content,
      done: tasks.done,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(and(eq(tasks.issueId, issueId), eq(tasks.userId, user.id)))
    .orderBy(asc(tasks.position))
})

/**
 * Get root tasks (tasks without parent) for an issue
 */
export const getRootTasks = cache(async (issueId: string) => {
  const user = await getAuthUser()
  if (!user) return []

  return await db
    .select({
      id: tasks.id,
      parentTaskId: tasks.parentTaskId,
      content: tasks.content,
      done: tasks.done,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.issueId, issueId),
        eq(tasks.userId, user.id),
        isNull(tasks.parentTaskId),
      ),
    )
    .orderBy(asc(tasks.position))
})

/**
 * Get subtasks for a parent task
 */
export const getSubtasks = cache(async (parentTaskId: string) => {
  const user = await getAuthUser()
  if (!user) return []

  return await db
    .select({
      id: tasks.id,
      parentTaskId: tasks.parentTaskId,
      content: tasks.content,
      done: tasks.done,
      position: tasks.position,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(and(eq(tasks.parentTaskId, parentTaskId), eq(tasks.userId, user.id)))
    .orderBy(asc(tasks.position))
})
