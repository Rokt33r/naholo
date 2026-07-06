import { cn } from '@/lib/utils'
import type { ActiveProjectSubscriptionResponse } from '@/hooks/use-active-project-subscription'

type ProjectStatus = ActiveProjectSubscriptionResponse['projectStatus']

const STATUS_STYLES: Record<ProjectStatus, string> = {
  free: 'bg-muted text-muted-foreground',
  active:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  suspended: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200',
  'seats-exceeded':
    'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  free: 'Free',
  active: 'Active',
  suspended: 'Suspended',
  'seats-exceeded': 'Seats exceeded',
}

type SubscriptionStatusBadgeProps = {
  status: ProjectStatus
  className?: string
}

export function SubscriptionStatusBadge({
  status,
  className,
}: SubscriptionStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
