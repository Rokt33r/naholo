import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PaddleSubscriptionStatus } from '@/server/db/schema'

const STATUS_CLASSES: Record<PaddleSubscriptionStatus, string> = {
  active:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  trialing:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  past_due:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  paused: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  incomplete: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
}

export function PaddleSubscriptionStatusBadge({
  status,
}: {
  status: PaddleSubscriptionStatus
}) {
  return (
    <Badge variant='secondary' className={cn(STATUS_CLASSES[status])}>
      {status}
    </Badge>
  )
}
