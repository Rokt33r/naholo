import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const BUMP_LEVELS = ['major', 'minor', 'patch']

const level = process.argv[2]
if (level == null || !BUMP_LEVELS.includes(level)) {
  console.error(
    `Pass a bump level: ${BUMP_LEVELS.join(' | ')} — e.g. pnpm bump-claude-plugin minor`,
  )
  process.exit(1)
}

const repoRoot = process.cwd()
const buildScriptPath = path.join(repoRoot, 'scripts/build-claude-plugin.ts')

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

// Bump the PLUGIN_VERSION constant in build-claude-plugin.ts.
const source = fs.readFileSync(buildScriptPath, 'utf8')
const match = source.match(/const PLUGIN_VERSION = '([^']+)'/)
if (match == null) {
  console.error(
    `Could not find a PLUGIN_VERSION constant in ${path.relative(repoRoot, buildScriptPath)}.`,
  )
  process.exit(1)
}

const version = bumpVersion(match[1], level)
fs.writeFileSync(
  buildScriptPath,
  source.replace(match[0], `const PLUGIN_VERSION = '${version}'`),
)

const tag = `naholo-claude-plugin@${version}`

// Commit the bumped script, tag the commit with the plugin-stream prefix
execFileSync('git', ['commit', '-m', tag, '--', buildScriptPath], {
  cwd: repoRoot,
  stdio: 'inherit',
})
execFileSync('git', ['tag', tag], { cwd: repoRoot, stdio: 'inherit' })

console.log(
  `\nBumped naholo-claude-plugin to ${version}, tagged and pushed ${tag}.`,
)

function bumpVersion(current: string, bumpLevel: string): string {
  const parts = current.split('.').map((part) => Number.parseInt(part, 10))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    console.error(`PLUGIN_VERSION '${current}' is not a valid X.Y.Z version.`)
    process.exit(1)
  }
  const [major, minor, patch] = parts
  if (bumpLevel === 'major') {
    return `${major + 1}.0.0`
  }
  if (bumpLevel === 'minor') {
    return `${major}.${minor + 1}.0`
  }
  return `${major}.${minor}.${patch + 1}`
}
