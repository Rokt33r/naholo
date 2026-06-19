import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ProjectState } from './project-state.js'

const STOP_HOOK_COMMAND = 'naholo agent claude-code-stop'

interface CommandHook {
  type: 'command'
  command: string
}

interface HookEntry {
  matcher?: string
  hooks?: CommandHook[]
}

interface ClaudeSettings {
  hooks?: {
    [event: string]: HookEntry[] | unknown
  }
  [key: string]: unknown
}

function readSettings(settingsPath: string): ClaudeSettings {
  if (!fs.existsSync(settingsPath)) {
    return {}
  }
  const raw = fs.readFileSync(settingsPath, 'utf-8').trim()
  if (raw.length === 0) {
    return {}
  }
  const parsed: unknown = JSON.parse(raw)
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {}
  }
  return parsed as ClaudeSettings
}

function hasCommandHook(
  settings: ClaudeSettings,
  event: string,
  command: string,
): boolean {
  const entries = settings.hooks?.[event]
  if (!Array.isArray(entries)) {
    return false
  }
  for (const entry of entries) {
    if (entry == null || typeof entry !== 'object') {
      continue
    }
    const inner = (entry as HookEntry).hooks
    if (!Array.isArray(inner)) {
      continue
    }
    for (const h of inner) {
      if (
        h != null &&
        typeof h === 'object' &&
        h.type === 'command' &&
        h.command === command
      ) {
        return true
      }
    }
  }
  return false
}

function addCommandHook(
  settings: ClaudeSettings,
  event: string,
  command: string,
): boolean {
  if (hasCommandHook(settings, event, command)) {
    return false
  }
  const hooks = (settings.hooks ?? {}) as NonNullable<ClaudeSettings['hooks']>
  const existing = hooks[event]
  const entries: HookEntry[] = Array.isArray(existing)
    ? (existing as HookEntry[])
    : []
  entries.push({
    matcher: '*',
    hooks: [{ type: 'command', command }],
  })
  hooks[event] = entries
  settings.hooks = hooks
  return true
}

export function hasNaholoHooks(settingsPath: string): boolean {
  const settings = readSettings(settingsPath)
  return hasCommandHook(settings, 'Stop', STOP_HOOK_COMMAND)
}

export function installNaholoHooks(
  settingsPath: string,
): 'added' | 'already-present' {
  const settings = readSettings(settingsPath)
  const addedStop = addCommandHook(settings, 'Stop', STOP_HOOK_COMMAND)
  if (!addedStop) {
    return 'already-present'
  }
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
  return 'added'
}

export function getProjectSettingsPath(projectState: ProjectState): string {
  const filename =
    projectState.kind === 'covert' ? 'settings.local.json' : 'settings.json'
  return path.join(projectState.root, '.claude', filename)
}

export function uninstallNaholoHooks(settingsPath: string): boolean {
  if (!fs.existsSync(settingsPath)) {
    return false
  }
  const settings = readSettings(settingsPath)
  const removed = removeCommandHook(settings, 'Stop', STOP_HOOK_COMMAND)
  if (!removed) {
    return false
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
  return true
}

export function uninstallGlobalNaholoHooks(): boolean {
  return uninstallNaholoHooks(
    path.join(os.homedir(), '.claude', 'settings.json'),
  )
}

function removeCommandHook(
  settings: ClaudeSettings,
  event: string,
  command: string,
): boolean {
  const entries = settings.hooks?.[event]
  if (!Array.isArray(entries)) {
    return false
  }
  let changed = false
  const next: HookEntry[] = []
  for (const entry of entries) {
    if (entry == null || typeof entry !== 'object') {
      next.push(entry as HookEntry)
      continue
    }
    const inner = (entry as HookEntry).hooks
    if (!Array.isArray(inner)) {
      next.push(entry as HookEntry)
      continue
    }
    const remaining = inner.filter(
      (h) =>
        !(
          h != null &&
          typeof h === 'object' &&
          h.type === 'command' &&
          h.command === command
        ),
    )
    if (remaining.length === inner.length) {
      next.push(entry as HookEntry)
      continue
    }
    changed = true
    if (remaining.length > 0) {
      next.push({ ...(entry as HookEntry), hooks: remaining })
    }
  }
  if (!changed) {
    return false
  }
  const hooks = settings.hooks as NonNullable<ClaudeSettings['hooks']>
  if (next.length > 0) {
    hooks[event] = next
  } else {
    delete hooks[event]
  }
  return true
}
