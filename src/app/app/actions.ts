'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthUser,
  requireAdminProjectOperator,
  requireProjectOperator,
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
import { provisionPolarTrialForProject } from '@/server/services/polar-trial'
import { db } from '@/server/db'
import { createOperation } from '@/server/services/operation'
import { createOperationLog } from '@/server/services/operation-log'
import {
  createObjective,
  updateObjective,
  setObjectiveDone,
  deleteObjective,
} from '@/server/services/objective'

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

  const notificationEmail = await db.query.userNotificationEmails.findFirst({
    columns: { email: true },
    where: (t, { eq }) => eq(t.userId, user.id),
  })
  if (notificationEmail == null) {
    return err(
      new Error(
        'Configure a notification email on your account before creating a project.',
      ),
    )
  }

  const result = await createProject({ name, slug, description })
  if (result.success) {
    const operator = await createProjectOperator({
      projectId: result.data.id,
      userId: user.id,
      name: user.name,
      role: 'admin',
    })

    await provisionPolarTrialForProject({
      projectId: result.data.id,
      billingEmail: notificationEmail.email,
      createdByOperatorId: operator.id,
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
 * Operations
 */

export async function createOperationAction(
  projectSlug: string,
  title: string,
): Promise<ReturnResult<{ id: string; number: number }>> {
  const { projectOperator, project } = await requireProjectOperator(projectSlug)

  const result = await createOperation({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    title,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}`)
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
 * Objectives
 */

export async function createObjectiveAction(
  projectSlug: string,
  operationNumber: number,
  name: string,
  parentObjectiveId?: string,
): Promise<ReturnResult<{ id: string }>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await createObjective({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    name,
    parentObjectiveId,
  })
  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}

export async function updateObjectiveAction(
  projectSlug: string,
  operationNumber: number,
  id: string,
  name: string,
): Promise<ReturnResult<undefined>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await updateObjective({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    objectiveId: id,
    name,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}

export async function setObjectiveDoneAction(
  projectSlug: string,
  operationNumber: number,
  id: string,
  done: boolean,
): Promise<ReturnResult<undefined>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await setObjectiveDone({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    objectiveId: id,
    done,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}

export async function deleteObjectiveAction(
  projectSlug: string,
  operationNumber: number,
  id: string,
): Promise<ReturnResult<undefined>> {
  const { projectOperator, project, operation } = await requireOperationAccess(
    projectSlug,
    operationNumber,
  )

  const result = await deleteObjective({
    projectOperatorId: projectOperator.id,
    projectId: project.id,
    operationId: operation.id,
    objectiveId: id,
  })

  if (result.success) {
    revalidatePath(`/app/projects/${projectSlug}/operations/${operationNumber}`)
  }

  return result
}
