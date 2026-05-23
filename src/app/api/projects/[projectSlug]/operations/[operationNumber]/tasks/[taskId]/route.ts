import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationTaskAccess } from '@/server/auth/permissions'
import {
  updateTask,
  updateTaskNote,
  setTaskDone,
  deleteTask,
} from '@/server/services/task'
import { getSourceClientId } from '@/server/realtime/publish'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
    taskId: string
  }>
}

const updateTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').trim().optional(),
  note: z.string().trim().nullable().optional(),
  done: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, taskId } = await context.params
    const { projectOperator, project, operation } =
      await requireOperationTaskAccess(projectSlug, operationNumber, taskId)

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = updateTaskSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, note, done } = validation.data
    const sourceClientId = getSourceClientId(request)

    if (name !== undefined) {
      const result = await updateTask({
        projectOperatorId: projectOperator.id,
        projectId: project.id,
        operationId: operation.id,
        taskId,
        name,
        sourceClientId,
      })
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 404 },
        )
      }
    }

    if (note !== undefined) {
      const result = await updateTaskNote({
        projectOperatorId: projectOperator.id,
        projectId: project.id,
        operationId: operation.id,
        taskId,
        note,
        sourceClientId,
      })
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 404 },
        )
      }
    }

    if (done !== undefined) {
      const result = await setTaskDone({
        projectOperatorId: projectOperator.id,
        projectId: project.id,
        operationId: operation.id,
        taskId,
        done,
        sourceClientId,
      })
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 404 },
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber, taskId } = await context.params
    const { projectOperator, project, operation } =
      await requireOperationTaskAccess(projectSlug, operationNumber, taskId)

    const sourceClientId = getSourceClientId(request)

    const result = await deleteTask({
      projectOperatorId: projectOperator.id,
      projectId: project.id,
      operationId: operation.id,
      taskId,
      sourceClientId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return mapApiError(error)
  }
}
