import { realtimeBroker } from './index'
import type { RealtimeEvent } from './types'

// TODO: After introduce prismy, make the client id available from the context.
export function getSourceClientId(request: Request): string | undefined {
  return request.headers.get('x-client-id') ?? undefined
}

export function publishOperationEvent(
  operationId: string,
  type: RealtimeEvent['type'],
  sourceClientId?: string,
): void {
  // Fire-and-forget — realtime is best-effort, must not block or fail mutations
  realtimeBroker
    .publish(`operation:${operationId}`, { type, sourceClientId })
    .catch((error: unknown) => {
      console.error('[realtime] Failed to publish event:', error)
    })
}
