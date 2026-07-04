export const CALLSIGN_PATTERN = /^[a-z0-9.-]+$/

export function isValidCallsign(value: string): boolean {
  return CALLSIGN_PATTERN.test(value)
}

export function deriveCallsignFromEmail(email: string): string {
  const atIndex = email.lastIndexOf('@')
  const localPart = atIndex === -1 ? email : email.slice(0, atIndex)
  return localPart.toLowerCase().replace(/[^a-z0-9.-]/g, '.')
}

export function deriveCallsignFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '.')
}
