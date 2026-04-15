import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const CLI_PKG = join(ROOT, 'packages/naholo-cli')
const OUT_DIR = join(ROOT, 'public/cli')
const OUT_FILE = join(OUT_DIR, 'naholo-cli.js')
const CHECKSUM_FILE = join(OUT_DIR, 'checksums.txt')

async function main() {
  console.log('Building CLI...')
  execSync('npx tsup', { cwd: CLI_PKG, stdio: 'inherit' })

  console.log('Copying to public/cli/...')
  mkdirSync(OUT_DIR, { recursive: true })
  copyFileSync(join(CLI_PKG, 'dist/cli.js'), OUT_FILE)

  console.log('Generating checksum...')
  const content = readFileSync(OUT_FILE)
  const hash = createHash('sha256').update(content).digest('hex')
  writeFileSync(CHECKSUM_FILE, `${hash}  naholo-cli.js\n`)

  console.log('Done!')
  console.log(`  ${OUT_FILE}`)
  console.log(`  ${CHECKSUM_FILE}`)
}

main().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
