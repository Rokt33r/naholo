'use server'

import { revalidatePath } from 'next/cache'
import { getAuthUser } from '@/server/auth/utils'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { auth } from '../../server/auth/auth'
import {
  createProject,
  updateProject,
  deleteProject,
} from '@/server/services/project'
import { createIssue, updateIssue, deleteIssue } from '@/server/services/issue'
import { createLog, updateLog, deleteLog } from '@/server/services/log'
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

  const project = await createProject(user.id, { name, description })

  revalidatePath('/app')

  return ok({ id: project.id })
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

  await updateProject(user.id, id, { name, description })

  revalidatePath('/app')

  return ok()
}

export async function deleteProjectAction(
  id: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  await deleteProject(user.id, id)

  revalidatePath('/app')

  return ok()
}

/**
 * Issues
 */

export async function createIssueAction(
  projectId: string,
  title: string,
): Promise<ReturnResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const issue = await createIssue(user.id, { projectId, title })

  revalidatePath(`/app/projects/${projectId}`)

  return ok({ id: issue.id })
}

export async function updateIssueAction(
  id: string,
  title: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const issue = await updateIssue(user.id, id, { title })

  if (issue) {
    revalidatePath(`/app/projects/${issue.projectId}`)
  }

  return ok()
}

export async function deleteIssueAction(
  id: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const issue = await deleteIssue(user.id, id)

  if (issue) {
    revalidatePath(`/app/projects/${issue.projectId}`)
  }

  return ok()
}

/**
 * Logs
 */

export async function createLogAction(
  projectId: string,
  issueId: string,
  content: string,
): Promise<ReturnResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const log = await createLog(user.id, { projectId, issueId, content })

  revalidatePath(`/app/projects/${projectId}/issues/${issueId}`)

  return ok({ id: log.id })
}

export async function updateLogAction(
  id: string,
  content: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const log = await updateLog(user.id, id, content)

  if (log) {
    revalidatePath(`/app/projects/${log.projectId}/issues/${log.issueId}`)
  }

  return ok()
}

export async function deleteLogAction(
  id: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const log = await deleteLog(user.id, id)

  if (log) {
    revalidatePath(`/app/projects/${log.projectId}/issues/${log.issueId}`)
  }

  return ok()
}

/**
 * Tasks
 */

export async function createTaskAction(
  projectId: string,
  issueId: string,
  content: string,
  parentTaskId?: string,
): Promise<ReturnResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const task = await createTask(user.id, {
    projectId,
    issueId,
    content,
    parentTaskId,
  })

  revalidatePath(`/app/projects/${projectId}/issues/${issueId}`)

  return ok({ id: task.id })
}

export async function updateTaskAction(
  id: string,
  content: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const task = await updateTask(user.id, id, content)

  if (task) {
    revalidatePath(`/app/projects/${task.projectId}/issues/${task.issueId}`)
  }

  return ok()
}

export async function setTaskDoneAction(
  id: string,
  done: boolean,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const task = await setTaskDone(user.id, id, done)

  if (task) {
    revalidatePath(`/app/projects/${task.projectId}/issues/${task.issueId}`)
  }

  return ok()
}

export async function deleteTaskAction(
  id: string,
): Promise<ReturnResult<undefined>> {
  const user = await getAuthUser()
  if (!user) {
    return err(new Error('Unauthorized'))
  }

  const task = await deleteTask(user.id, id)

  if (task) {
    revalidatePath(`/app/projects/${task.projectId}/issues/${task.issueId}`)
  }

  return ok()
}
