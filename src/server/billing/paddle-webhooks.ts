import { Paddle, Webhooks } from '@paddle/paddle-node-sdk'

// Instantiating Paddle registers the SDK's crypto runtime via NodeRuntime.initialize().
// Without this, `Webhooks#isSignatureValid` returns false unconditionally because
// RuntimeProvider has no crypto backend. Real API key wiring comes in a follow-up op;
// the placeholder is sufficient for webhook-only use today.
new Paddle(process.env.PADDLE_API_KEY ?? 'placeholder-webhooks-only')

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
