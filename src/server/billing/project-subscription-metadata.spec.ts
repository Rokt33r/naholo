import { vi, describe, it, expect } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  formatProjectSubscriptionMetadata,
  parseProjectSubscriptionMetadata,
} from './project-subscription-metadata'

const PROJECT_ID = '11111111-1111-4111-8111-111111111111'
const OPERATOR_ID = '22222222-2222-4222-8222-222222222222'

describe('formatProjectSubscriptionMetadata', () => {
  it('formats the required fields', () => {
    const out = formatProjectSubscriptionMetadata({
      projectId: PROJECT_ID,
      projectOperatorId: OPERATOR_ID,
    })
    expect(out).toEqual({
      projectId: PROJECT_ID,
      projectOperatorId: OPERATOR_ID,
    })
  })

  it('throws when given a non-uuid value', () => {
    expect(() =>
      formatProjectSubscriptionMetadata({
        projectId: 'not-a-uuid',
        projectOperatorId: OPERATOR_ID,
      } as never),
    ).toThrow()
  })
})

describe('parseProjectSubscriptionMetadata', () => {
  it('round-trips a formatted payload', () => {
    const formatted = formatProjectSubscriptionMetadata({
      projectId: PROJECT_ID,
      projectOperatorId: OPERATOR_ID,
    })
    const parsed = parseProjectSubscriptionMetadata(formatted)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }
    expect(parsed.data).toEqual({
      projectId: PROJECT_ID,
      projectOperatorId: OPERATOR_ID,
    })
  })

  it('returns no-metadata for null', () => {
    const parsed = parseProjectSubscriptionMetadata(null)
    expect(parsed).toEqual({ ok: false, reason: 'no-metadata' })
  })

  it('returns no-metadata for undefined', () => {
    const parsed = parseProjectSubscriptionMetadata(undefined)
    expect(parsed).toEqual({ ok: false, reason: 'no-metadata' })
  })

  it('returns no-metadata for non-object values', () => {
    expect(parseProjectSubscriptionMetadata('string')).toEqual({
      ok: false,
      reason: 'no-metadata',
    })
    expect(parseProjectSubscriptionMetadata(42)).toEqual({
      ok: false,
      reason: 'no-metadata',
    })
  })

  it('returns malformed when a required field is missing', () => {
    const parsed = parseProjectSubscriptionMetadata({ projectId: PROJECT_ID })
    expect(parsed).toEqual({ ok: false, reason: 'malformed' })
  })

  it('returns malformed when a field is not a uuid', () => {
    const parsed = parseProjectSubscriptionMetadata({
      projectId: 'not-a-uuid',
      projectOperatorId: OPERATOR_ID,
    })
    expect(parsed).toEqual({ ok: false, reason: 'malformed' })
  })
})
