import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import * as schema from './schema'
import { config } from '../server/config'

const rdsCaPath = join(process.cwd(), 'certs', 'rds-ca-bundle.pem')
const useRdsCa = config.isProduction && existsSync(rdsCaPath)

const poolConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ...(useRdsCa
    ? {
        ssl: {
          rejectUnauthorized: true,
          ca: readFileSync(rdsCaPath).toString(),
        },
      }
    : {}),
}

const pool = new Pool(poolConfig)

export const db = drizzle(pool, { schema })
