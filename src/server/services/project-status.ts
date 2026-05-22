import 'server-only'
import { isActiveSubscriptionStatus } from './project-subscription'

export type ProjectStatus = 'active' | 'trial' | 'inactive' | 'seats-exceeded'

export type DeriveProjectStatusResult = {
  status: ProjectStatus
  trialUntil: Date | null
}

export function deriveProjectStatus(input: {
  polarStatus: string | null
  seats: number | null
  usedSeats: number
  trial: { expiresAt: Date } | null
  now?: Date
}): DeriveProjectStatusResult {
  const { polarStatus, seats, usedSeats, trial } = input
  const now = input.now ?? new Date()

  if (polarStatus != null && isActiveSubscriptionStatus(polarStatus)) {
    const cap = seats ?? 1
    if (usedSeats > cap) {
      return { status: 'seats-exceeded', trialUntil: null }
    }
    return { status: 'active', trialUntil: null }
  }

  if (trial != null && trial.expiresAt > now) {
    return { status: 'trial', trialUntil: trial.expiresAt }
  }

  return { status: 'inactive', trialUntil: null }
}
