// Centralized configuration for all environment variables

function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

export const config = {
  // Database
  databaseUrl: getOptionalEnv(
    'DATABASE_URL',
    'postgresql://bocchi:bocchi@localhost:5432/bocchi',
  ),

  // Authentication
  sessionSecret: getRequiredEnv('SESSION_SECRET'),

  // Environment
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
} as const
