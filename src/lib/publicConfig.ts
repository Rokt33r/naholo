export type PolarPublicConfig = {
  environment: 'sandbox' | 'production'
  productId: string
}

const billingEnabled = process.env.NEXT_PUBLIC_BILLING === 'true'

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
  polar: polarPublicConfig,
} as const

export function requirePolarPublicConfig(): PolarPublicConfig {
  if (publicConfig.polar == null) {
    throw new Error(
      'Polar public config is not loaded — set NEXT_PUBLIC_BILLING=true to enable billing',
    )
  }
  return publicConfig.polar
}
