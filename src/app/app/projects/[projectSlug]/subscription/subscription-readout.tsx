import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
import type { ActiveProjectSubscriptionResponse } from '@/hooks/use-active-project-subscription'

type PaddleSubscription = NonNullable<
  ActiveProjectSubscriptionResponse['subscription']
>['paddleSubscription']

export function SubscriptionReadout({
  paddleSubscription,
  usedSeats,
}: {
  paddleSubscription: PaddleSubscription | null
  usedSeats: number
}) {
  const status = paddleSubscription?.status ?? null
  const seatQuantity = paddleSubscription?.seatQuantity ?? 0
  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Status</span>
        <SubscriptionStatusBadge status={status} />
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Seats</span>
        <span className='font-medium'>
          {usedSeats} / {seatQuantity} used
        </span>
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Trial ends</span>
        <span className='font-medium'>
          {formatDate(paddleSubscription?.trialEndsAt)}
        </span>
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Next billing</span>
        <span className='font-medium'>
          {formatDate(paddleSubscription?.currentPeriodEnd)}
        </span>
      </div>
    </div>
  )
}

function formatDate(value: string | null | undefined): string {
  if (value == null) {
    return '—'
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return '—'
  }
  return d.toLocaleDateString()
}
