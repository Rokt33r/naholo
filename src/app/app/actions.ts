'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { projects, issues, logs, tasks } from '@/db/schema'
import { getAuthUser } from '@/server/auth/utils'
import { success, failure } from '@/server/types'
import type { ActionResult } from '@/server/types'
import { eq, and, isNull } from 'drizzle-orm'

/**
 * Projects
 */

export async function createProjectAction(
  name: string,
  description?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [project] = await db
    .insert(projects)
    .values({
      userId: user.id,
      name,
      description,
    })
    .returning({ id: projects.id })

  revalidatePath('/app')

  return success({ id: project.id })
}

export async function updateProjectAction(
  id: string,
  name: string,
  description?: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  await db
    .update(projects)
    .set({
      name,
      description,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))

  revalidatePath('/app')

  return success()
}

export async function deleteProjectAction(
  id: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))

  revalidatePath('/app')

  return success()
}

/**
 * Issues
 */

export async function createIssueAction(
  projectId: string,
  title: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [issue] = await db
    .insert(issues)
    .values({
      projectId,
      userId: user.id,
      title,
    })
    .returning({ id: issues.id })

  revalidatePath(`/app/projects/${projectId}`)

  return success({ id: issue.id })
}

export async function updateIssueAction(
  id: string,
  title: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [issue] = await db
    .update(issues)
    .set({
      title,
      updatedAt: new Date(),
    })
    .where(and(eq(issues.id, id), eq(issues.userId, user.id)))
    .returning({ projectId: issues.projectId })

  if (issue) {
    revalidatePath(`/app/projects/${issue.projectId}`)
  }

  return success()
}

export async function closeIssueAction(
  id: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [issue] = await db
    .update(issues)
    .set({
      closed: true,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(issues.id, id), eq(issues.userId, user.id)))
    .returning({ projectId: issues.projectId })

  if (issue) {
    revalidatePath(`/app/projects/${issue.projectId}`)
  }

  return success()
}

export async function reopenIssueAction(
  id: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [issue] = await db
    .update(issues)
    .set({
      closed: false,
      closedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(issues.id, id), eq(issues.userId, user.id)))
    .returning({ projectId: issues.projectId })

  if (issue) {
    revalidatePath(`/app/projects/${issue.projectId}`)
  }

  return success()
}

export async function deleteIssueAction(
  id: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [issue] = await db
    .delete(issues)
    .where(and(eq(issues.id, id), eq(issues.userId, user.id)))
    .returning({ projectId: issues.projectId })

  if (issue) {
    revalidatePath(`/app/projects/${issue.projectId}`)
  }

  return success()
}

/**
 * Logs
 */

export async function createLogAction(
  projectId: string,
  issueId: string,
  content: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [log] = await db
    .insert(logs)
    .values({
      projectId,
      issueId,
      userId: user.id,
      content,
    })
    .returning({ id: logs.id })

  // Update issue's updatedAt timestamp
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  revalidatePath(`/app/projects/${projectId}/issues/${issueId}`)

  return success({ id: log.id })
}

export async function updateLogAction(
  id: string,
  content: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [log] = await db
    .update(logs)
    .set({
      content,
      updatedAt: new Date(),
    })
    .where(and(eq(logs.id, id), eq(logs.userId, user.id)))
    .returning({ projectId: logs.projectId, issueId: logs.issueId })

  if (log) {
    revalidatePath(`/app/projects/${log.projectId}/issues/${log.issueId}`)
  }

  return success()
}

export async function deleteLogAction(
  id: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [log] = await db
    .delete(logs)
    .where(and(eq(logs.id, id), eq(logs.userId, user.id)))
    .returning({ projectId: logs.projectId, issueId: logs.issueId })

  if (log) {
    revalidatePath(`/app/projects/${log.projectId}/issues/${log.issueId}`)
  }

  return success()
}

/**
 * Tasks
 */

export async function createTaskAction(
  projectId: string,
  issueId: string,
  content: string,
  parentTaskId?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  // Get the maximum position for tasks at this level
  const existingTasks = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(
      and(
        eq(tasks.issueId, issueId),
        eq(tasks.userId, user.id),
        parentTaskId
          ? eq(tasks.parentTaskId, parentTaskId)
          : isNull(tasks.parentTaskId),
      ),
    )
    .orderBy(tasks.position)

  const maxPosition =
    existingTasks.length > 0
      ? Math.max(...existingTasks.map((t) => t.position))
      : -1

  const [task] = await db
    .insert(tasks)
    .values({
      projectId,
      issueId,
      userId: user.id,
      parentTaskId: parentTaskId || null,
      content,
      position: maxPosition + 1,
    })
    .returning({ id: tasks.id })

  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId))

  revalidatePath(`/app/projects/${projectId}/issues/${issueId}`)

  return success({ id: task.id })
}

export async function updateTaskAction(
  id: string,
  content: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [task] = await db
    .update(tasks)
    .set({
      content,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning({ projectId: tasks.projectId, issueId: tasks.issueId })

  if (task) {
    await db
      .update(issues)
      .set({ updatedAt: new Date() })
      .where(eq(issues.id, task.issueId))

    revalidatePath(`/app/projects/${task.projectId}/issues/${task.issueId}`)
  }

  return success()
}

export async function setTaskDoneAction(
  id: string,
  done: boolean,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [task] = await db
    .update(tasks)
    .set({
      done,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning({ projectId: tasks.projectId, issueId: tasks.issueId })

  if (task) {
    await db
      .update(issues)
      .set({ updatedAt: new Date() })
      .where(eq(issues.id, task.issueId))

    revalidatePath(`/app/projects/${task.projectId}/issues/${task.issueId}`)
  }

  return success()
}

export async function deleteTaskAction(
  id: string,
): Promise<ActionResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return failure(new Error('Unauthorized'))
  }

  const [task] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning({ projectId: tasks.projectId, issueId: tasks.issueId })

  if (task) {
    await db
      .update(issues)
      .set({ updatedAt: new Date() })
      .where(eq(issues.id, task.issueId))

    revalidatePath(`/app/projects/${task.projectId}/issues/${task.issueId}`)
  }

  return success()
}
