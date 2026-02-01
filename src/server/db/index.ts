import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as schema from './schema'
import { config } from '../config'

const rdsCaPath = join(process.cwd(), 'certs', 'rds-ca-bundle.pem')
const usingSsl = config.database.ssl === 'true'

const poolConfig = {
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
}

const pool = new Pool(poolConfig)

export const db = drizzle(pool, { schema })
