import { NextRequest } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import { realtimeBroker } from '@/server/realtime'

type RouteContext = {
  params: Promise<{
    projectSlug: string
  }>
}

const KEEPALIVE_INTERVAL_MS = 30_000

function isStreamClosedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as NodeJS.ErrnoException).code === 'ERR_INVALID_STATE'
  )
}

/**
 * GET /api/projects/[projectSlug]/billing/stream
 * SSE stream for project-subscription change events
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug } = await context.params
    const { project } = await requireProjectOperator(projectSlug)

    const channel = `project:${project.id}`
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`),
        )

        const subscription = realtimeBroker.subscribe(channel, (event) => {
          if (event.type !== 'project-subscription-changed') {
            return
          }
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            )
          } catch (error) {
            if (!isStreamClosedError(error)) {
              console.error('Failed to enqueue realtime event:', error)
            }
          }
        })

        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: keepalive\n\n`))
          } catch (error) {
            clearInterval(keepaliveInterval)
            if (!isStreamClosedError(error)) {
              console.error('Failed to enqueue keepalive:', error)
            }
          }
        }, KEEPALIVE_INTERVAL_MS)

        request.signal.addEventListener('abort', () => {
          subscription.unsubscribe()
          clearInterval(keepaliveInterval)
          try {
            controller.close()
          } catch (error) {
            if (!isStreamClosedError(error)) {
              console.error('Failed to close stream:', error)
            }
          }
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    return mapApiError(error)
  }
}
