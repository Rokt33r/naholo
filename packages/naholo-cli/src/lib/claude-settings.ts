import fs from 'node:fs'
import path from 'node:path'

const STOP_HOOK_COMMAND = 'naholo agent link-agent-session'

interface CommandHook {
  type: 'command'
  command: string
}

interface StopHookEntry {
  matcher?: string
  hooks?: CommandHook[]
}

interface ClaudeSettings {
  hooks?: {
    Stop?: StopHookEntry[]
    [event: string]: unknown
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

function hasStopHookCommand(
  settings: ClaudeSettings,
  command: string,
): boolean {
  const stop = settings.hooks?.Stop
  if (!Array.isArray(stop)) {
    return false
  }
  for (const entry of stop) {
    if (entry == null || typeof entry !== 'object') {
      continue
    }
    const inner = entry.hooks
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

export function installStopHook(
  settingsPath: string,
): 'added' | 'already-present' {
  const settings = readSettings(settingsPath)
  if (hasStopHookCommand(settings, STOP_HOOK_COMMAND)) {
    return 'already-present'
  }

  const hooks = (settings.hooks ?? {}) as NonNullable<ClaudeSettings['hooks']>
  const stop = Array.isArray(hooks.Stop) ? hooks.Stop : []
  stop.push({
    matcher: '*',
    hooks: [{ type: 'command', command: STOP_HOOK_COMMAND }],
  })
  hooks.Stop = stop
  settings.hooks = hooks

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
  return 'added'
}
