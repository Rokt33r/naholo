export type PaddlePublicConfig = {
  clientToken: string
  environment: 'sandbox' | 'production'
  priceId: string
  manageUrl: string
}

const billingEnabled = process.env.NEXT_PUBLIC_BILLING === 'true'

const paddlePublicConfig: PaddlePublicConfig | null = billingEnabled
  ? {
      clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '',
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production'
          ? 'production'
          : 'sandbox',
      priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || '',
      manageUrl: process.env.NEXT_PUBLIC_PADDLE_MANAGE_URL ?? '',
    }
  : null

export const publicConfig = {
  billing: billingEnabled,
  paddle: paddlePublicConfig,
} as const

export function requirePaddlePublicConfig(): PaddlePublicConfig {
  if (publicConfig.paddle == null) {
    throw new Error(
      'Paddle public config is not loaded — set NEXT_PUBLIC_BILLING=true to enable billing',
    )
  }
  return publicConfig.paddle
}
