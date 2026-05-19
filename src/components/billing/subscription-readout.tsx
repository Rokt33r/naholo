import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
import type { ActiveProjectSubscriptionResponse } from '@/hooks/use-active-project-subscription'
import { ExternalLink } from 'lucide-react'
import { publicConfig } from '@/lib/publicConfig'
import { Button } from '../ui/button'

type PolarSubscription = NonNullable<
  ActiveProjectSubscriptionResponse['subscription']
>['polarSubscription']

export function SubscriptionReadout({
  polarSubscription,
  usedSeats,
}: {
  polarSubscription: PolarSubscription | null
  usedSeats: number
}) {
  const status = polarSubscription?.status ?? null
  const seats = polarSubscription?.seats

  const portalUrl = publicConfig.polar?.portalUrl

  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Status</span>
        <SubscriptionStatusBadge status={status} />
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Seats</span>
        <span className='font-medium'>
          {usedSeats} / {seats ?? '—'} used
        </span>
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Trial ends</span>
        <span className='font-medium'>
          {formatDate(polarSubscription?.trialEnd)}
        </span>
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Next billing</span>
        <span className='font-medium'>
          {formatDate(polarSubscription?.currentPeriodEnd)}
        </span>
      </div>
      <hr />
      <div>
        <Button asChild variant='outline' className='self-start mb-2'>
          <a href={portalUrl} target='_blank' rel='noopener noreferrer'>
            Open Polar portal
            <ExternalLink className='size-4' />
          </a>
        </Button>
        <p className='text-muted-foreground text-sm'>
          Download invoices and change your payment method from the Polar
          portal. Sign in with the billing email for this subscription.
        </p>
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
