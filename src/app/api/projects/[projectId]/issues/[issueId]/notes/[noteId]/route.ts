import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/server/auth/utils'
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
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId, noteId } = await context.params

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

  const result = await updateNote(user.id, noteId, issueId, { title, content })
  if (!result.success) {
    return NextResponse.json({ error: result.error.message }, { status: 404 })
  }

  return NextResponse.json(result.data)
}

/**
 * DELETE /api/projects/[projectId]/issues/[issueId]/notes/[noteId]
 * Delete a note
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issueId, noteId } = await context.params

  const result = await deleteNote(user.id, noteId, issueId)
  if (!result.success) {
    return NextResponse.json({ error: result.error.message }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
