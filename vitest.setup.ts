import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.test into process.env before any module imports config.ts
const envPath = resolve(__dirname, '.env.test')
const envContent = readFileSync(envPath, 'utf-8')

for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (trimmed === '' || trimmed.startsWith('#')) {
    continue
  }
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) {
    continue
  }
  const key = trimmed.slice(0, eqIndex)
  const value = trimmed.slice(eqIndex + 1)
  process.env[key] = value
}
