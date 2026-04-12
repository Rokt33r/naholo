import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueNoteAccess } from '@/server/auth/permissions'
import { updateNote, deleteNote } from '@/server/services/note'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    issueNumber: string
    noteId: string
  }>
}

const updateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  content: z.string().trim(),
})

/**
 * PATCH /api/projects/[projectId]/issues/[issueNumber]/notes/[noteId]
 * Update a note
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber, noteId } = await context.params
    const { projectWorker, issue } = await requireIssueNoteAccess(
      projectSlug,
      issueNumber,
      noteId,
    )

    let body
    try {
      body = await request.json()
    } catch (error) {
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

    const result = await updateNote({
      projectWorkerId: projectWorker.id,
      noteId,
      issueId: issue.id,
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
 * DELETE /api/projects/[projectId]/issues/[issueNumber]/notes/[noteId]
 * Delete a note
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber, noteId } = await context.params
    const { projectWorker, issue } = await requireIssueNoteAccess(
      projectSlug,
      issueNumber,
      noteId,
    )

    const result = await deleteNote({
      projectWorkerId: projectWorker.id,
      noteId,
      issueId: issue.id,
    })
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
