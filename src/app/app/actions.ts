'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthUser,
  requireAdminProjectOperator,
  requireOperationAccess,
} from '@/server/auth/permissions'
import type { ReturnResult } from '@/lib/return-result'
import { ok, err } from '@/lib/return-result'
import { auth } from '../../server/auth/auth'
import {
  createProject,
  updateProject,
  deleteProject,
} from '@/server/services/project'
import { createProjectOperator } from '@/server/services/project-operator'
import { createOperationLog } from '@/server/services/operation-log'
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
  slug: string,
  description?: string,
): Promise<ReturnResult<{ id: string; slug: string }>> {
  const user = await getAuthUser()
  if (user == null) {
    return err(new Error('Unauthorized'))
  }

  const result = await createProject({ name, slug, description })
  if (result.success) {
    await createProjectOperator({
      projectId: result.data.id,
      userId: user.id,
      name: user.name,
      role: 'admin',
    })

    revalidatePath('/app')
  }

  return result
}

export async function updateProjectAction(
  projectSlug: string,
  data: { name?: string; description?: string; slug?: string },
): Promise<ReturnResult<{ slug: string }>> {
  const { project } = await requireAdminProjectOperator(projectSlug)

  const result = await updateProject(project.id, data)
  if (result.success) {
    revalidatePath('/app')
    return ok({ slug: data.slug ?? projectSlug })
  }

  return result
}

export async function deleteProjectAction(
  projectSlug: string,
): Promise<ReturnResult<undefined>> {
  const { project } = await requireAdminProjectOperator(projectSlug)

  const result = await deleteProject(project.id)
  if (result.success) {
    revalidatePath('/app')
  }

  return result
}

/**
 * Operation Logs
 */

export async function createOperationLogAction(
  projectSlug: string,
  operationNumber: number,
  content: string,
): Promise<ReturnResult<{ id: string }>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await createOperationLog({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    content,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
    return ok({ id: result.data.id })
  }

  return result
}

/**
 * Tasks
 */

export async function createTaskAction(
  projectSlug: string,
  operationNumber: number,
  name: string,
  parentTaskId?: string,
): Promise<ReturnResult<{ id: string }>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await createTask({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    name,
    parentTaskId,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}

export async function updateTaskAction(
  projectSlug: string,
  operationNumber: number,
  id: string,
  name: string,
): Promise<ReturnResult<undefined>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await updateTask({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    taskId: id,
    name,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}

export async function setTaskDoneAction(
  projectSlug: string,
  operationNumber: number,
  id: string,
  done: boolean,
): Promise<ReturnResult<undefined>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await setTaskDone({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    taskId: id,
    done,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}

export async function deleteTaskAction(
  projectSlug: string,
  operationNumber: number,
  id: string,
): Promise<ReturnResult<undefined>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await deleteTask({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    taskId: id,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}
