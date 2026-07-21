import fs from 'node:fs'
import path from 'node:path'
import { parse, stringify } from 'yaml'
import { getNaholoHomeDir, getDefaultProfileName } from './global-config'

export interface Profile {
  baseUrl: string
  token: string
  tokenName: string
  createdAt: string
  soul?: string | null
  locale?: string | null
}

function getProfilesDir(): string {
  return path.join(getNaholoHomeDir(), 'profiles')
}

function getProfilePath(name: string): string {
  return path.join(getProfilesDir(), `${name}.yml`)
}

export function readProfile(name: string): Profile | null {
  const filePath = getProfilePath(name)
  if (!fs.existsSync(filePath)) {
    return null
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  return parse(content) as Profile
}

export function writeProfile(name: string, profile: Profile): void {
  const dir = getProfilesDir()
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(getProfilePath(name), stringify(profile), 'utf-8')
}

export function deleteProfile(name: string): boolean {
  const filePath = getProfilePath(name)
  if (!fs.existsSync(filePath)) {
    return false
  }
  fs.unlinkSync(filePath)
  return true
}

export function listProfiles(): string[] {
  const dir = getProfilesDir()
  if (!fs.existsSync(dir)) {
    return []
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yml'))
    .map((f) => f.replace(/\.yml$/, ''))
}

export function getActiveProfile(profileOverride?: string): {
  name: string
  profile: Profile
} | null {
  const name = profileOverride ?? getDefaultProfileName()
  if (!name) {
    return null
  }
  const profile = readProfile(name)
  if (!profile) {
    return null
  }
  return { name, profile }
}

export function profileNameFromBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl)
    return url.host.replace(/[^a-zA-Z0-9.-]/g, '-')
  } catch {
    return baseUrl.replace(/[^a-zA-Z0-9.-]/g, '-')
  }
}
