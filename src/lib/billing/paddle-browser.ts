import { initializePaddle as initializePaddleSdk } from '@paddle/paddle-js'
import type { Paddle, PaddleEventData } from '@paddle/paddle-js'
import { requirePaddlePublicConfig } from '@/lib/publicConfig'

let paddlePromise: Promise<Paddle | undefined> | null = null
const listeners = new Set<(event: PaddleEventData) => void>()

export function initializePaddle(): Promise<Paddle | undefined> {
  if (paddlePromise != null) {
    return paddlePromise
  }
  const { clientToken, environment } = requirePaddlePublicConfig()
  paddlePromise = initializePaddleSdk({
    token: clientToken,
    environment,
    eventCallback: (event) => {
      for (const listener of listeners) {
        listener(event)
      }
    },
  })
  return paddlePromise
}

export function subscribePaddleEvents(
  listener: (event: PaddleEventData) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
