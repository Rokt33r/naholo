import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIssueNoteAccess } from '@/server/auth/permissions'
import { updateNote, deleteNote } from '@/server/services/note'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    issueNumber: string
    noteName: string
  }>
}

const updateNoteSchema = z.object({
  name: z.string().min(1, 'Name is required').trim().optional(),
  content: z.string().trim().optional(),
})

/**
 * PATCH /api/projects/[projectSlug]/issues/[issueNumber]/notes/[noteName]
 * Update a note
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber, noteName } = await context.params
    const { projectWorker, issue } = await requireIssueNoteAccess(
      projectSlug,
      issueNumber,
      noteName,
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

    const { name, content } = validation.data

    const result = await updateNote({
      projectWorkerId: projectWorker.id,
      noteName,
      issueId: issue.id,
      name,
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
 * DELETE /api/projects/[projectSlug]/issues/[issueNumber]/notes/[noteName]
 * Delete a note
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, issueNumber, noteName } = await context.params
    const { projectWorker, issue } = await requireIssueNoteAccess(
      projectSlug,
      issueNumber,
      noteName,
    )

    const result = await deleteNote({
      projectWorkerId: projectWorker.id,
      noteName,
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
