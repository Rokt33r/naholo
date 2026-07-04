export const CALLSIGN_PATTERN = /^[a-z0-9.-]+$/

export function isValidCallsign(value: string): boolean {
  return CALLSIGN_PATTERN.test(value)
}

export function deriveCallsignFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '.')
}
