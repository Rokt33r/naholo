import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const BUMP_LEVELS = [
  'major',
  'minor',
  'patch',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease',
]

const level = process.argv[2]
if (level == null || !BUMP_LEVELS.includes(level)) {
  console.error(
    `Pass a bump level: ${BUMP_LEVELS.join(' | ')} — e.g. pnpm bump-cli minor`,
  )
  process.exit(1)
}

const repoRoot = process.cwd()
const pkgDir = path.join(repoRoot, 'packages/naholo-cli')
const pkgJsonPath = path.join(pkgDir, 'package.json')
const pkgLockPath = path.join(pkgDir, 'package-lock.json')

// Refuse to run on a dirty tree
const gitStatus = execFileSync('git', ['status', '--porcelain'], {
  cwd: repoRoot,
  encoding: 'utf8',
})
if (gitStatus.trim() !== '') {
  console.error(
    'Git working directory not clean. Commit or stash your changes before bumping.',
  )
  process.exit(1)
}

// Bump the version in package.json only — npm skips git when run from a
// subdirectory, so we drive the commit and tag ourselves below.
execFileSync('npm', ['version', '--no-git-tag-version', level], {
  cwd: pkgDir,
  stdio: 'inherit',
})

const { version } = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
const tag = `@naholo/cli@${version}`

// Commit the bumped package.json + package-lock.json, then tag the commit with the cli-stream prefix.
execFileSync('git', ['commit', '-m', tag, '--', pkgJsonPath, pkgLockPath], {
  cwd: repoRoot,
  stdio: 'inherit',
})
execFileSync('git', ['tag', tag], { cwd: repoRoot, stdio: 'inherit' })

console.log(`\nBumped @naholo/cli to ${version} and tagged ${tag}.`)
