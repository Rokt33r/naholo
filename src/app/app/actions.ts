'use server'

import { revalidatePath } from 'next/cache'
import { getAuthUser, requireProjectWorker } from '@/server/auth/utils'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { auth } from '../../server/auth/auth'
import {
  createProject,
  updateProject,
  deleteProject,
} from '@/server/services/project'
import { createIssue } from '@/server/services/issue'
import { createLog } from '@/server/services/log'
import {
  createTask,
  updateTask,
  setTaskDone,
  deleteTask,
} from '@/server/services/task'

export async function refreshSessionAction() {
  return auth.refreshSession()
}

export async function logoutAction(): Promise<ReturnResult<undefined>> {
  await auth.signOut()
  return ok()
}

/**
 * Projects
 */

export async function createProjectAction(
  name: string,
  description?: string,
): Promise<ReturnResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const result = await createProject(user.id, { name, description })
  if (result.success) {
    revalidatePath('/app')
  }

  return result
}

export async function updateProjectAction(
  id: string,
  name: string,
  description?: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const result = await updateProject(user.id, id, { name, description })
  if (result.success) {
    revalidatePath('/app')
  }

  return result
}

export async function deleteProjectAction(
  id: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const result = await deleteProject(user.id, id)
  if (result.success) {
    revalidatePath('/app')
  }

  return result
}

/**
 * Issues
 */

export async function createIssueAction(
  projectId: string,
  title: string,
): Promise<ReturnResult<{ id: string }>> {
  const { userId, projectWorkerId } = await requireProjectWorker(projectId)

  const result = await createIssue(userId, {
    projectId,
    projectWorkerId,
    title,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectId}`)
  }

  return result
}

/**
 * Logs
 */

export async function createLogAction(
  projectId: string,
  issueId: string,
  content: string,
): Promise<ReturnResult<{ id: string }>> {
  const { userId, projectWorkerId } = await requireProjectWorker(projectId)

  const result = await createLog(userId, {
    projectId,
    projectWorkerId,
    issueId,
    content,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueId}`)
    return ok({ id: result.data.id })
  }

  return result
}

/**
 * Tasks
 */

export async function createTaskAction(
  projectId: string,
  issueId: string,
  name: string,
  parentTaskId?: string,
): Promise<ReturnResult<{ id: string }>> {
  const { userId, projectWorkerId } = await requireProjectWorker(projectId)

  const result = await createTask(userId, {
    projectId,
    projectWorkerId,
    issueId,
    name,
    parentTaskId,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueId}`)
  }

  return result
}

export async function updateTaskAction(
  projectId: string,
  issueId: string,
  id: string,
  name: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const result = await updateTask(user.id, issueId, id, name)

  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueId}`)
  }

  return result
}

export async function setTaskDoneAction(
  projectId: string,
  issueId: string,
  id: string,
  done: boolean,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const result = await setTaskDone(user.id, issueId, id, done)

  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueId}`)
  }

  return result
}

export async function deleteTaskAction(
  projectId: string,
  issueId: string,
  id: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const result = await deleteTask(user.id, issueId, id)

  if (result.success) {
    revalidatePath(`/app/projects/${projectId}/issues/${issueId}`)
  }

  return result
}
