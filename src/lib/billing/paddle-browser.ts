import { initializePaddle as initializePaddleSdk } from '@paddle/paddle-js'
import type { Paddle } from '@paddle/paddle-js'

let paddlePromise: Promise<Paddle | undefined> | null = null

export function initializePaddle(): Promise<Paddle | undefined> {
  if (paddlePromise != null) {
    return paddlePromise
  }
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT
  if (token == null || token === '') {
    throw new Error('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set')
  }
  if (environment !== 'sandbox' && environment !== 'production') {
    throw new Error(
      'NEXT_PUBLIC_PADDLE_ENVIRONMENT must be "sandbox" or "production"',
    )
  }
  const promise = initializePaddleSdk({
    token,
    environment,
  })
  paddlePromise = promise
  return promise
}
