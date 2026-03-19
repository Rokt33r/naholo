import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const rdsCaPath = join(process.cwd(), 'certs', 'rds-ca-bundle.pem')
const usingSsl = process.env.DB_SSL === 'true'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'naholo',
  user: process.env.DB_USER || 'naholo',
  password: process.env.DB_PASSWORD || 'naholo',
  ssl:
    usingSsl && existsSync(rdsCaPath)
      ? {
          rejectUnauthorized: true,
          ca: readFileSync(rdsCaPath),
        }
      : false,
})

const db = drizzle(pool)

async function main() {
  console.log('Running migrations...')
  await migrate(db, {
    migrationsFolder: join(process.cwd(), 'src/server/db/migrations'),
  })
  console.log('Migrations complete.')
  await pool.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
