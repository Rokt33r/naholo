import { cn } from '@/lib/utils'

export type PolarSubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'

const STATUS_STYLES: Record<PolarSubscriptionStatus | 'none', string> = {
  none: 'bg-muted text-muted-foreground',
  incomplete:
    'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  incomplete_expired: 'bg-muted text-muted-foreground',
  trialing: 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  active:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  past_due: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200',
  canceled: 'bg-muted text-muted-foreground',
}

const STATUS_LABELS: Record<PolarSubscriptionStatus | 'none', string> = {
  none: 'No subscription',
  incomplete: 'Incomplete',
  incomplete_expired: 'Incomplete (expired)',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
}

function normalizeStatus(
  status: string | null,
): PolarSubscriptionStatus | 'none' {
  if (status == null) {
    return 'none'
  }
  if (status in STATUS_STYLES) {
    return status as PolarSubscriptionStatus
  }
  return 'none'
}

type SubscriptionStatusBadgeProps = {
  status: string | null
  className?: string
}

export function SubscriptionStatusBadge({
  status,
  className,
}: SubscriptionStatusBadgeProps) {
  const key = normalizeStatus(status)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[key],
        className,
      )}
    >
      {STATUS_LABELS[key]}
    </span>
  )
}
