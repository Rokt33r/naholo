export type PolarPublicConfig = {
  environment: 'sandbox' | 'production'
  productId: string
  portalUrl: string
}

const billingEnabled = process.env.NEXT_PUBLIC_BILLING === 'true'

const polarPublicConfig: PolarPublicConfig | null = billingEnabled
  ? buildPolarPublicConfig()
  : null

function buildPolarPublicConfig(): PolarPublicConfig {
  const environment =
    process.env.NEXT_PUBLIC_POLAR_ENVIRONMENT === 'production'
      ? 'production'
      : 'sandbox'
  const polarOrganizationSlug =
    process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_SLUG || ''
  const host = environment === 'production' ? 'polar.sh' : 'sandbox.polar.sh'
  return {
    environment,
    productId: process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID || '',
    portalUrl: `https://${host}/${polarOrganizationSlug}/portal`,
  }
}

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
