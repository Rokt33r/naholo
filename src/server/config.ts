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

  googleOAuth: {
    clientId: getOptionalEnv('GOOGLE_OAUTH_CLIENT_ID'),
    clientSecret: getOptionalEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
    redirectUri: getOptionalEnv('GOOGLE_OAUTH_REDIRECT_URI'),
    stateSecret: getRequiredEnv('GOOGLE_OAUTH_STATE_SECRET'),
  },

  paddle: {
    apiKey: getRequiredEnv('PADDLE_API_KEY'),
    webhookSecret: getRequiredEnv('PADDLE_WEBHOOK_SECRET'),
    projectTokenSecret: getRequiredEnv('PADDLE_PROJECT_TOKEN_SECRET'),
    environment: getOptionalEnv('PADDLE_ENVIRONMENT', 'sandbox'),
  },
} as const
