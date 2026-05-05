import { Environment, Paddle, Webhooks } from '@paddle/paddle-node-sdk'
import { config } from '@/server/config'

// Shared server-side Paddle module. Used for both webhook crypto
// (`Webhooks#isSignatureValid`) and outbound API calls
// (transactions.get, subscriptions.get) for subscription sync.
// Instantiating Paddle also registers the SDK's crypto runtime via
// NodeRuntime.initialize() — without it, signature verification returns
// false unconditionally because RuntimeProvider has no crypto backend.
const environment =
  config.paddle.environment === 'sandbox'
    ? Environment.sandbox
    : Environment.production

export const paddleServerClient = new Paddle(config.paddle.apiKey, {
  environment,
})

export async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (signatureHeader == null) {
    return false
  }
  return new Webhooks().isSignatureValid(
    rawBody,
    config.paddle.webhookSecret,
    signatureHeader,
  )
}
