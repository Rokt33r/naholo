import fs from 'node:fs'
import path from 'node:path'

const STOP_HOOK_COMMAND = 'naholo agent claude-code-stop'
const SESSION_END_HOOK_COMMAND = 'naholo agent claude-code-session-end'

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
  return (
    hasCommandHook(settings, 'Stop', STOP_HOOK_COMMAND) &&
    hasCommandHook(settings, 'SessionEnd', SESSION_END_HOOK_COMMAND)
  )
}

export function installNaholoHooks(
  settingsPath: string,
): 'added' | 'already-present' {
  const settings = readSettings(settingsPath)
  const addedStop = addCommandHook(settings, 'Stop', STOP_HOOK_COMMAND)
  const addedSessionEnd = addCommandHook(
    settings,
    'SessionEnd',
    SESSION_END_HOOK_COMMAND,
  )
  if (!addedStop && !addedSessionEnd) {
    return 'already-present'
  }
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
  return 'added'
}
