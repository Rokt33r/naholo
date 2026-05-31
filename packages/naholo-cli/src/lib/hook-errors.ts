import fs from 'node:fs'
import path from 'node:path'
import { getNaholoLocalDir } from './local-operations.js'

export type HookSource = 'claude-code-stop'

export function getHookErrorsLogPath(): string {
  return path.join(getNaholoLocalDir(), 'hook-errors.log')
}

export function appendHookError(source: HookSource, message: string): void {
  const logPath = getHookErrorsLogPath()
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  const line = `${new Date().toISOString()} [${source}] ${message}\n`
  fs.appendFileSync(logPath, line)
}
