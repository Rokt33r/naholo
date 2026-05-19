export const SEAT_UNIT_PRICE_CENTS = 500

export function formatSeatPriceCopy(): string {
  return '$5 per human operator per month + VAT. Bots are always free.'
}

export function computeProrationCents(input: {
  deltaSeats: number
  currentPeriodStart: Date | string | null
  currentPeriodEnd: Date | string | null
  now: Date
}): number {
  const { deltaSeats } = input
  if (deltaSeats <= 0) {
    return 0
  }

  const start = toDate(input.currentPeriodStart)
  const end = toDate(input.currentPeriodEnd)
  if (start == null || end == null) {
    return deltaSeats * SEAT_UNIT_PRICE_CENTS
  }

  const day = 86_400_000
  const cycleDays = Math.max(1, (end.getTime() - start.getTime()) / day)
  const daysLeft = Math.max(0, (end.getTime() - input.now.getTime()) / day)
  const fraction = Math.min(1, daysLeft / cycleDays)
  return Math.round(deltaSeats * SEAT_UNIT_PRICE_CENTS * fraction)
}

function toDate(value: Date | string | null): Date | null {
  if (value == null) {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
