import { cn } from '@/lib/utils'
import type { ActiveProjectSubscriptionResponse } from '@/hooks/use-active-project-subscription'

type ProjectStatus = ActiveProjectSubscriptionResponse['projectStatus']

const STATUS_STYLES: Record<ProjectStatus, string> = {
  active:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  trial: 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  inactive: 'bg-muted text-muted-foreground',
  'seats-exceeded':
    'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  trial: 'Trial',
  inactive: 'Inactive',
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
