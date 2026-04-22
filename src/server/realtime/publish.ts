import { realtimeBroker } from './index'
import type { RealtimeEvent } from './types'

export function publishOperationEvent(
  operationId: string,
  type: RealtimeEvent['type'],
): void {
  // Fire-and-forget — realtime is best-effort, must not block or fail mutations
  realtimeBroker
    .publish(`operation:${operationId}`, { type })
    .catch((error: unknown) => {
      console.error('[realtime] Failed to publish event:', error)
    })
}
