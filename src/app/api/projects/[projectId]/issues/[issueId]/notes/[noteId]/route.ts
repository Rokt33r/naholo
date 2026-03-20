import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireProjectWorker } from '@/server/auth/utils'
import { updateNote, deleteNote } from '@/server/services/note'

type RouteContext = {
  params: Promise<{
    projectId: string
    issueId: string
    noteId: string
  }>
}

const updateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  content: z.string().trim(),
})

/**
 * PATCH /api/projects/[projectId]/issues/[issueId]/notes/[noteId]
 * Update a note
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueId, noteId } = await context.params
    const { projectWorkerId } = await requireProjectWorker(projectId)

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = updateNoteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { title, content } = validation.data

    const result = await updateNote(projectWorkerId, noteId, issueId, {
      title,
      content,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]/notes/[noteId]
 * Delete a note
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectId, issueId, noteId } = await context.params
    const { projectWorkerId } = await requireProjectWorker(projectId)

    const result = await deleteNote(projectWorkerId, noteId, issueId)
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
