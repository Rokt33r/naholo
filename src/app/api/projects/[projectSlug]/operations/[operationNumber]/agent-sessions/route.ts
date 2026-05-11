import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import { upsertAgentSession } from '@/server/services/agent-session'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
  }>
}

const upsertAgentSessionSchema = z.object({
  sessionId: z.string().min(1),
  title: z.string().nullable(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
  transcript: z.string().nullable(),
  transcriptTruncated: z.boolean(),
  transcriptSizeBytes: z.number().int().nonnegative(),
})

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = upsertAgentSessionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      )
    }

    const { project, operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const result = await upsertAgentSession({
      projectId: project.id,
      operationId: operation.id,
      sessionId: validation.data.sessionId,
      title: validation.data.title,
      startedAt: new Date(validation.data.startedAt),
      endedAt: new Date(validation.data.endedAt),
      transcript: validation.data.transcript,
      transcriptTruncated: validation.data.transcriptTruncated,
      transcriptSizeBytes: validation.data.transcriptSizeBytes,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json(result.data, { status: 200 })
  } catch (error) {
    return mapApiError(error)
  }
}
