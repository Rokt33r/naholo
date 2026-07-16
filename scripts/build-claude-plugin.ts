import fs from 'node:fs'
import path from 'node:path'
import {
  buildSkillStub,
  splitSkill,
  writeSkillFile,
} from '../packages/naholo-cli/src/skills.js'

const PLUGIN_VERSION = '0.1.1'
const MIN_CLI_VERSION = '0.12.0'
const PLUGIN_NAME = 'naholo-claude-plugin'
const PLUGIN_DESCRIPTION = 'Naholo core skills'
const DOCTOR_SKILL = 'naholo-doctor'

const repoRoot = process.cwd()
const skillsSrcDir = path.join(repoRoot, 'packages/naholo-cli/src/skills')

main()

function main(): void {
  const outDir = path.resolve(getArg('--out') ?? 'claude-plugin-dist')
  const version = getArg('--version') ?? PLUGIN_VERSION

  fs.rmSync(outDir, { recursive: true, force: true })

  const skillCount = writeSkills(outDir, version)

  writeManifests(outDir, version)

  console.log(
    `Built ${PLUGIN_NAME}@${version} → ${path.relative(repoRoot, outDir)} (${skillCount} skills)`,
  )
}

function writeSkills(outDir: string, version: string): number {
  const skillsOutDir = path.join(outDir, 'skills')
  fs.mkdirSync(skillsOutDir, { recursive: true })

  const skillFiles = fs
    .readdirSync(skillsSrcDir)
    .filter((file) => file.endsWith('.md'))
  for (const file of skillFiles) {
    const name = file.slice(0, -3)
    const content = fs.readFileSync(path.join(skillsSrcDir, file), 'utf-8')
    const emitted =
      name === DOCTOR_SKILL
        ? buildDoctorSkill(content, version)
        : buildSkillStub(name, content)
    writeSkillFile(name, emitted, skillsOutDir)
  }
  return skillFiles.length
}

function writeManifests(outDir: string, version: string): void {
  const pluginDir = path.join(outDir, '.claude-plugin')
  fs.mkdirSync(pluginDir, { recursive: true })
  writeJson(path.join(pluginDir, 'plugin.json'), {
    name: PLUGIN_NAME,
    version,
    description: PLUGIN_DESCRIPTION,
  })
  writeJson(path.join(pluginDir, 'marketplace.json'), {
    name: 'naholo',
    owner: { name: 'naholo' },
    plugins: [
      {
        name: PLUGIN_NAME,
        source: './',
        description: PLUGIN_DESCRIPTION,
        version,
      },
    ],
  })
}

function buildDoctorSkill(content: string, pluginVersion: string): string {
  const { frontmatter, body } = splitSkill(content)
  const versionBlock = [
    '```',
    `naholoClaudePluginVersion: ${pluginVersion}`,
    `minNaholoCliVersion: ${MIN_CLI_VERSION}`,
    '```',
  ].join('\n')
  return `${frontmatter}\n${versionBlock}\n\n${body}`
}

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index !== -1 ? process.argv[index + 1] : undefined
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
