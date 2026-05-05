'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
import { useProjectContext } from '@/components/app/project-context'
import { useActiveProjectSubscription } from '@/hooks/use-active-project-subscription'

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

type BillingTabProps = {
  onClose: () => void
}

export function BillingTab({ onClose }: BillingTabProps) {
  const { projectSlug } = useProjectContext()
  const { data, isLoading, error } = useActiveProjectSubscription(projectSlug)

  if (isLoading) {
    return (
      <div className='text-muted-foreground py-8 text-center text-sm'>
        Loading…
      </div>
    )
  }

  if (error != null || data == null) {
    return (
      <div className='text-muted-foreground py-8 text-center text-sm'>
        Failed to load subscription.
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>Billing</h3>
        <p className='text-muted-foreground text-sm'>
          $5 per human operator per month + VAT. Bots are always free.
        </p>
      </div>

      <div className='space-y-3 rounded-lg border p-4'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>Status</span>
          <SubscriptionStatusBadge
            status={data.subscription?.paddleSubscription.status ?? null}
          />
        </div>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>Seats</span>
          <span className='font-medium'>
            {data.usedSeats} /{' '}
            {data.subscription?.paddleSubscription.seatQuantity ?? 0} used
          </span>
        </div>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>Trial ends</span>
          <span className='font-medium'>
            {formatDate(data.subscription?.paddleSubscription.trialEndsAt)}
          </span>
        </div>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>Next billing</span>
          <span className='font-medium'>
            {formatDate(data.subscription?.paddleSubscription.currentPeriodEnd)}
          </span>
        </div>
      </div>

      <Button asChild className='self-start'>
        <Link
          href={`/app/projects/${projectSlug}/subscription`}
          onClick={onClose}
        >
          Manage subscription
        </Link>
      </Button>

      <p className='text-muted-foreground text-xs'>
        Seats and cancellation are managed on the subscription page.
      </p>
    </div>
  )
}
