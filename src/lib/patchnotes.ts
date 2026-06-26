import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type PatchnoteStream = 'web' | 'cli'

export type PatchnoteEntry = {
  version: string
  date: string
  body: string
}

export type PatchnoteEntryWithStream = PatchnoteEntry & {
  stream: PatchnoteStream
}

const STREAMS: PatchnoteStream[] = ['web', 'cli']

const PATCHNOTES_DIR = join(process.cwd(), 'src', 'content', 'patchnotes')

export function getPatchnotes(stream: PatchnoteStream): PatchnoteEntry[] {
  const streamDir = join(PATCHNOTES_DIR, stream)

  let fileNames: string[]
  try {
    fileNames = readdirSync(streamDir)
  } catch (error) {
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return []
    }
    throw error
  }

  const entries = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) =>
      parseEntry(readFileSync(join(streamDir, fileName), 'utf8')),
    )

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

export function getAllPatchnotes(): PatchnoteEntryWithStream[] {
  const entries = STREAMS.flatMap((stream) =>
    getPatchnotes(stream).map((entry) => ({ ...entry, stream })),
  )

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

function parseEntry(raw: string): PatchnoteEntry {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (match == null) {
    return { version: '', date: '', body: raw.trim() }
  }

  const [, frontmatter, body] = match
  const meta = parseFrontmatter(frontmatter)

  return {
    version: meta.version ?? '',
    date: meta.date ?? '',
    body: body.trim(),
  }
}

function parseFrontmatter(frontmatter: string): Record<string, string> {
  const meta: Record<string, string> = {}
  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) {
      continue
    }
    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    meta[key] = value
  }
  return meta
}
