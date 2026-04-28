import { cn } from '@/lib/utils'
import type { ProjectSubscriptionView } from '@/hooks/use-project-subscription'

type SubscriptionStatus = NonNullable<ProjectSubscriptionView['status']>

const STATUS_STYLES: Record<SubscriptionStatus | 'none', string> = {
  none: 'bg-muted text-muted-foreground',
  incomplete:
    'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  trialing: 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  active:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  past_due: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200',
  paused:
    'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  canceled: 'bg-muted text-muted-foreground',
}

const STATUS_LABELS: Record<SubscriptionStatus | 'none', string> = {
  none: 'No subscription',
  incomplete: 'Incomplete',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  paused: 'Paused',
  canceled: 'Canceled',
}

type SubscriptionStatusBadgeProps = {
  status: SubscriptionStatus | null
  className?: string
}

export function SubscriptionStatusBadge({
  status,
  className,
}: SubscriptionStatusBadgeProps) {
  const key = status ?? 'none'
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
