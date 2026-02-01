import { defineConfig } from 'drizzle-kit'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from './src/server/config'

const rdsCaPath = join(process.cwd(), 'certs', 'rds-ca-bundle.pem')
const usingSsl = config.database.ssl === 'true'

export default defineConfig({
  schema: './src/server/db/schema/*.ts',
  out: './src/server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    ssl: usingSsl
      ? {
          rejectUnauthorized: true,
          ca: readFileSync(rdsCaPath),
        }
      : false,
  },
})
