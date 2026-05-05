import { SignJWT, jwtVerify, errors } from 'jose'
import { config } from '@/server/config'

const ISSUER = 'naholo'
const AUDIENCE = 'paddle-checkout'
const EXPIRY_MS = 60 * 60 * 1000

const secretKey = new TextEncoder().encode(config.paddle.projectTokenSecret)

export async function signProjectSubscriptionCheckoutToken(input: {
  projectId: string
  projectOperatorId: string
}): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + EXPIRY_MS)
  const token = await new SignJWT({
    projectId: input.projectId,
    projectOperatorId: input.projectOperatorId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey)
  return { token, expiresAt }
}

export type VerifyTokenSuccess = {
  ok: true
  projectId: string
  projectOperatorId: string
  jti: string
}

export type VerifyTokenFailure = {
  ok: false
  reason: 'invalid' | 'expired' | 'malformed'
}

export type VerifyTokenResult = VerifyTokenSuccess | VerifyTokenFailure

export async function verifyProjectSubscriptionCheckoutToken(
  token: string,
): Promise<VerifyTokenResult> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    })
    const projectId = payload.projectId
    const projectOperatorId = payload.projectOperatorId
    const jti = payload.jti
    if (
      typeof projectId !== 'string' ||
      typeof projectOperatorId !== 'string' ||
      typeof jti !== 'string'
    ) {
      return { ok: false, reason: 'malformed' }
    }
    return { ok: true, projectId, projectOperatorId, jti }
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      return { ok: false, reason: 'expired' }
    }
    if (error instanceof errors.JOSEError) {
      return { ok: false, reason: 'invalid' }
    }
    console.error(error)
    return { ok: false, reason: 'malformed' }
  }
}
