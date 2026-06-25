import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

function getRequiredEnv(key: string): string {
  const value = process.env[key]

  // During Docker build, allow placeholder for server-only secrets
  // They will be provided at runtime via ECS task definition
  if (!value && process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn(
      `⚠️  ${key} not set during build - will be required at runtime`,
    )
    return 'build-time-placeholder'
  }

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getOptionalEnv(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || ''
}

export type PolarConfig = {
  accessToken: string
  webhookSecret: string
  environment: 'sandbox' | 'production'
  productId: string
}

type FileStorageConfig =
  | { driver: 'fs'; fsRoot: string }
  | { driver: 's3'; s3Bucket: string }

function buildFileStorageConfig(): FileStorageConfig {
  const driver = getOptionalEnv('NAHOLO_STORAGE_DRIVER', 'fs')

  if (driver === 'fs') {
    return {
      driver: 'fs',
      fsRoot: getOptionalEnv('NAHOLO_STORAGE_FS_ROOT', '.storage'),
    }
  }

  if (driver === 's3') {
    return {
      driver: 's3',
      s3Bucket: getRequiredEnv('NAHOLO_STORAGE_S3_BUCKET'),
    }
  }

  throw new Error(
    `Unknown NAHOLO_STORAGE_DRIVER: ${driver} (expected 'fs' or 's3')`,
  )
}

const fileStorageConfig = buildFileStorageConfig()

const billingEnabled = process.env.BILLING === 'true'

const polarConfig: PolarConfig | null = billingEnabled
  ? {
      accessToken: getRequiredEnv('POLAR_ACCESS_TOKEN'),
      webhookSecret: getRequiredEnv('POLAR_WEBHOOK_SECRET'),
      environment:
        getOptionalEnv('POLAR_ENVIRONMENT', 'sandbox') === 'production'
          ? 'production'
          : 'sandbox',
      productId: getRequiredEnv('POLAR_PRODUCT_ID'),
    }
  : null

export const config = {
  // Application
  baseUrl: getRequiredEnv('BASE_URL'),

  // Database
  database: {
    host: getOptionalEnv('DB_HOST', 'localhost'),
    port: parseInt(getOptionalEnv('DB_PORT', '5432'), 10),
    name: getOptionalEnv('DB_NAME', 'naholo'),
    user: getOptionalEnv('DB_USER', 'naholo'),
    password: getOptionalEnv('DB_PASSWORD', 'naholo'),
    ssl: getOptionalEnv('DB_SSL', 'true'),
  },

  // Authentication
  sessionSecret: getRequiredEnv('SESSION_SECRET'),

  // Environment
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // AWS SES (Email)
  aws: {
    region: getOptionalEnv('AWS_REGION', 'ap-northeast-1'),
    sesFromEmail: getOptionalEnv('AWS_SES_FROM_EMAIL', 'noreply@example.com'),
  },

  fileStorage: fileStorageConfig,

  googleOAuth: {
    clientId: getRequiredEnv('GOOGLE_OAUTH_CLIENT_ID'),
    clientSecret: getRequiredEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
    redirectUri: getRequiredEnv('GOOGLE_OAUTH_REDIRECT_URI'),
    stateSecret: getRequiredEnv('GOOGLE_OAUTH_STATE_SECRET'),
  },

  billing: billingEnabled,

  polar: polarConfig,
} as const

export function requirePolarConfig(): PolarConfig {
  if (config.polar == null) {
    throw new Error(
      'Polar config is not loaded — set BILLING=true to enable billing',
    )
  }
  return config.polar
}
