import { Environment, Paddle, Webhooks } from '@paddle/paddle-node-sdk'

// Shared server-side Paddle module. Used for both webhook crypto
// (`Webhooks#isSignatureValid`) and outbound API calls
// (transactions.get, subscriptions.get) for subscription sync.
// Instantiating Paddle also registers the SDK's crypto runtime via
// NodeRuntime.initialize() — without it, signature verification returns
// false unconditionally because RuntimeProvider has no crypto backend.
const apiKey = process.env.PADDLE_API_KEY
if (apiKey == null || apiKey === '') {
  throw new Error('PADDLE_API_KEY is not set')
}

const environment =
  process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox'
    ? Environment.sandbox
    : Environment.production

export const paddleServerClient = new Paddle(apiKey, { environment })

export async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (signatureHeader == null) {
    return false
  }
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (secret == null || secret === '') {
    throw new Error('PADDLE_WEBHOOK_SECRET is not set')
  }
  return new Webhooks().isSignatureValid(rawBody, secret, signatureHeader)
}
