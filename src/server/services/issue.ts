import 'server-only'
import { db } from '../db'
import { issues, tasks, projects } from '../db/schema'
import { eq, and, desc, count, sum, sql } from 'drizzle-orm'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { NotFoundError } from './errors'

export type Issue = {
  id: string
  projectId: string
  number: number
  title: string
  closed: boolean
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type IssueWithStats = {
  id: string
  number: number
  title: string
  lastLogPreview: string | null
  closed: boolean
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
  totalTasks: number
  completedTasks: number
}

/**
 * Get a single issue by ID or number, scoped to a project
 */
export async function getIssue(data: {
  projectId: string
  issueNumber: number
}): Promise<Issue | null> {
  const [issue] = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      number: issues.number,
      title: issues.title,
      closed: issues.closed,
      closedAt: issues.closedAt,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .where(
      and(
        eq(issues.number, data.issueNumber),
        eq(issues.projectId, data.projectId),
      ),
    )
    .limit(1)

  return issue || null
}

/**
 * List issues for a project with task statistics
 */
export async function listIssues(data: {
  projectId: string
  closed?: boolean
}): Promise<IssueWithStats[]> {
  const closed = data.closed ?? false

  const rows = await db
    .select({
      id: issues.id,
      number: issues.number,
      title: issues.title,
      lastLogPreview: issues.lastLogPreview,
      closed: issues.closed,
      closedAt: issues.closedAt,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      totalTasks: count(tasks.id).as('total_tasks'),
      completedTasks: sum(sql`CASE WHEN ${tasks.done} THEN 1 ELSE 0 END`).as(
        'completed_tasks',
      ),
    })
    .from(issues)
    .leftJoin(tasks, eq(tasks.issueId, issues.id))
    .where(and(eq(issues.projectId, data.projectId), eq(issues.closed, closed)))
    .groupBy(issues.id)
    .orderBy(desc(issues.updatedAt))

  // Convert sum result (string | null) to number
  return rows.map((row) => ({
    ...row,
    completedTasks: Number(row.completedTasks ?? 0),
  }))
}

/**
 * Create a new issue
 */
export async function createIssue(data: {
  projectWorkerId: string
  projectId: string
  title: string
}): Promise<ReturnResult<{ id: string; number: number }>> {
  return await db.transaction(async (tx) => {
    const [{ issueCounter }] = await tx
      .update(projects)
      .set({ issueCounter: sql`${projects.issueCounter} + 1` })
      .where(eq(projects.id, data.projectId))
      .returning({ issueCounter: projects.issueCounter })

    const [issue] = await tx
      .insert(issues)
      .values({
        projectId: data.projectId,
        projectWorkerId: data.projectWorkerId,
        title: data.title,
        number: issueCounter,
      })
      .returning({ id: issues.id })

    return ok({ id: issue.id, number: issueCounter })
  })
}

/**
 * Update an issue.
 */
export async function updateIssue(data: {
  projectId: string
  issueNumber: number
  title: string
}): Promise<ReturnResult<undefined>> {
  const [issue] = await db
    .update(issues)
    .set({
      title: data.title,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(issues.number, data.issueNumber),
        eq(issues.projectId, data.projectId),
      ),
    )
    .returning({ id: issues.id })

  if (!issue) {
    return err(new NotFoundError('Issue'))
  }

  return ok()
}

/**
 * Close an issue.
 */
export async function closeIssue(data: {
  projectId: string
  issueNumber: number
}): Promise<ReturnResult<undefined>> {
  const [issue] = await db
    .update(issues)
    .set({
      closed: true,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(issues.number, data.issueNumber),
        eq(issues.projectId, data.projectId),
      ),
    )
    .returning({ id: issues.id })

  if (!issue) {
    return err(new NotFoundError('Issue'))
  }

  return ok()
}

/**
 * Reopen an issue.
 */
export async function reopenIssue(data: {
  projectId: string
  issueNumber: number
}): Promise<ReturnResult<undefined>> {
  const [issue] = await db
    .update(issues)
    .set({
      closed: false,
      closedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(issues.number, data.issueNumber),
        eq(issues.projectId, data.projectId),
      ),
    )
    .returning({ id: issues.id })

  if (!issue) {
    return err(new NotFoundError('Issue'))
  }

  return ok()
}

/**
 * Delete an issue.
 */
export async function deleteIssue(data: {
  projectId: string
  issueNumber: number
}): Promise<ReturnResult<undefined>> {
  const [issue] = await db
    .delete(issues)
    .where(
      and(
        eq(issues.number, data.issueNumber),
        eq(issues.projectId, data.projectId),
      ),
    )
    .returning({ id: issues.id })

  if (!issue) {
    return err(new NotFoundError('Issue'))
  }

  return ok()
}

/**
 * Update issue's updatedAt timestamp. Used internally by log/task/note services.
 */
export async function touchIssue(issueId: string): Promise<void> {
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))
}

/**
 * Update issue's lastLogPreview. Used internally by log service.
 */
export async function updateIssueLastLogPreview(
  issueId: string,
  preview: string | null,
): Promise<void> {
  await db
    .update(issues)
    .set({
      updatedAt: new Date(),
      lastLogPreview: preview,
    })
    .where(eq(issues.id, issueId))
}
