import { defineConfig } from 'drizzle-kit'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { config } from './src/server/config'

const rdsCaPath = join(process.cwd(), 'certs', 'rds-ca-bundle.pem')
const useRdsCa = config.isProduction && existsSync(rdsCaPath)

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    ssl: { rejectUnauthorized: false },
  },
})
