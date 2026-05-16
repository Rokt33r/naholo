export type PaddlePublicConfig = {
  clientToken: string
  environment: 'sandbox' | 'production'
  priceId: string
  manageUrl: string
}

export type PolarPublicConfig = {
  environment: 'sandbox' | 'production'
  productId: string
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

const polarPublicConfig: PolarPublicConfig | null = billingEnabled
  ? {
      environment:
        process.env.NEXT_PUBLIC_POLAR_ENVIRONMENT === 'production'
          ? 'production'
          : 'sandbox',
      productId: process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID || '',
    }
  : null

export const publicConfig = {
  billing: billingEnabled,
  paddle: paddlePublicConfig,
  polar: polarPublicConfig,
} as const

export function requirePaddlePublicConfig(): PaddlePublicConfig {
  if (publicConfig.paddle == null) {
    throw new Error(
      'Paddle public config is not loaded — set NEXT_PUBLIC_BILLING=true to enable billing',
    )
  }
  return publicConfig.paddle
}

export function requirePolarPublicConfig(): PolarPublicConfig {
  if (publicConfig.polar == null) {
    throw new Error(
      'Polar public config is not loaded — set NEXT_PUBLIC_BILLING=true to enable billing',
    )
  }
  return publicConfig.polar
}
