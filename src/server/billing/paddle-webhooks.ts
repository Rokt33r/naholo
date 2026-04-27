import { Webhooks } from '@paddle/paddle-node-sdk'

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
