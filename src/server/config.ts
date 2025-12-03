// Centralized configuration for all environment variables

function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getOptionalEnv(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || ''
}

export const config = {
  // Database
  databaseUrl: getOptionalEnv(
    'DATABASE_URL',
    'postgresql://naholo:naholo@localhost:5432/naholo',
  ),

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
} as const
