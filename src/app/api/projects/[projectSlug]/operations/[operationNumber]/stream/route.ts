import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireOperationAccess } from '@/server/auth/permissions'
import { realtimeBroker } from '@/server/realtime'

type RouteContext = {
  params: Promise<{
    projectSlug: string
    operationNumber: string
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
 * GET /api/projects/[projectSlug]/operations/[operationNumber]/stream
 * SSE stream for realtime operation events
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectSlug, operationNumber } = await context.params
    const { operation } = await requireOperationAccess(
      projectSlug,
      operationNumber,
    )

    const channel = `operation:${operation.id}`
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connected event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`),
        )

        // Subscribe to realtime events
        const subscription = realtimeBroker.subscribe(channel, (event) => {
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

        // Periodic keepalive to prevent proxy/LB timeouts
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

        // Cleanup on client disconnect
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
