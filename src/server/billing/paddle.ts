import { Environment, Paddle, Webhooks } from '@paddle/paddle-node-sdk'
import { requirePaddleConfig } from '@/server/config'

// Shared server-side Paddle module. Used for both webhook crypto
// (`Webhooks#isSignatureValid`) and outbound API calls
// (transactions.get, subscriptions.get) for subscription sync.
// Instantiating Paddle also registers the SDK's crypto runtime via
// NodeRuntime.initialize() — without it, signature verification returns
// false unconditionally because RuntimeProvider has no crypto backend.
let cachedClient: Paddle | null = null
let cachedEnvironment: Environment | null = null

export function getPaddleServerClient(): Paddle {
  if (cachedClient == null) {
    const paddle = requirePaddleConfig()
    cachedClient = new Paddle(paddle.apiKey, {
      environment: getPaddleEnvironment(),
    })
  }
  return cachedClient
}

export function getPaddleEnvironment(): Environment {
  if (cachedEnvironment == null) {
    const paddle = requirePaddleConfig()
    cachedEnvironment =
      paddle.environment === 'sandbox'
        ? Environment.sandbox
        : Environment.production
  }
  return cachedEnvironment
}

export async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (signatureHeader == null) {
    return false
  }
  // Ensure Paddle SDK crypto runtime is initialized before signature checks.
  getPaddleServerClient()
  return new Webhooks().isSignatureValid(
    rawBody,
    requirePaddleConfig().webhookSecret,
    signatureHeader,
  )
}
