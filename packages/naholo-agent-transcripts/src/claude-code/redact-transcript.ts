export function redactTranscript(transcriptText: string): string {
  const idMap = new Map<string, string>()
  const out: string[] = []
  for (const line of transcriptText.split('\n')) {
    if (line.length === 0) {
      continue
    }
    let raw: unknown
    try {
      raw = JSON.parse(line)
    } catch (error) {
      if (error instanceof SyntaxError) {
        out.push(JSON.stringify({ pruneError: 'invalid_json' }))
        continue
      }
      throw error
    }
    out.push(JSON.stringify(prunedRow(idMap, raw)))
  }
  return out.join('\n') + (transcriptText.endsWith('\n') ? '\n' : '')
}

const KEEP_KEYS = new Set([
  'model',
  'name',
  'type',
  'role',
  'stop_reason',
  'userType',
  'entrypoint',
  'attributionSkill',
  'timestamp',
  'createdAt',
  'updatedAt',
])

const REDACTION_SENTINEL = '_redacted_'
const ID_LABEL_PREFIX = '_uuid_'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MSG_ID_REGEX = /^msg_[A-Za-z0-9]+$/
const TOOL_USE_ID_REGEX = /^toolu_[A-Za-z0-9]+$/

function prunedRow(idMap: Map<string, string>, raw: unknown): unknown {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { pruneError: 'non_object' }
  }
  return redactValue(idMap, null, raw)
}

function redactValue(
  idMap: Map<string, string>,
  key: string | null,
  value: unknown,
): unknown {
  if (typeof value === 'string') {
    if (key != null && KEEP_KEYS.has(key)) {
      return value
    }
    if (isIdShaped(value)) {
      return opaqueIdFor(idMap, value)
    }
    return value.length === 0 ? '' : REDACTION_SENTINEL
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(idMap, null, item))
  }
  if (value != null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactValue(idMap, k, v)
    }
    return out
  }
  return value
}

function opaqueIdFor(idMap: Map<string, string>, raw: string): string {
  const existing = idMap.get(raw)
  if (existing != null) {
    return existing
  }
  const label = `${ID_LABEL_PREFIX}${idMap.size + 1}_`
  idMap.set(raw, label)
  return label
}

function isIdShaped(value: string): boolean {
  return (
    UUID_REGEX.test(value) ||
    MSG_ID_REGEX.test(value) ||
    TOOL_USE_ID_REGEX.test(value)
  )
}
