'use client'

import { CheckoutButton } from '@/components/billing/checkout-button'
import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
import { useProjectContext } from '@/components/app/project-context'
import { useProjectSubscription } from '@/hooks/use-project-subscription'

function formatDate(value: string | null): string {
  if (value == null) {
    return '—'
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return '—'
  }
  return d.toLocaleDateString()
}

export function BillingTab() {
  const { projectId, projectSlug } = useProjectContext()
  const { data, isLoading, error } = useProjectSubscription(projectSlug)

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
          <SubscriptionStatusBadge status={data.status} />
        </div>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>Seats</span>
          <span className='font-medium'>
            {data.usedSeats} / {data.seatQuantity} used
          </span>
        </div>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>Trial ends</span>
          <span className='font-medium'>{formatDate(data.trialEndsAt)}</span>
        </div>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>Next billing</span>
          <span className='font-medium'>
            {formatDate(data.currentPeriodEnd)}
          </span>
        </div>
      </div>

      {!data.hasPaddleSubscription && (
        <div className='flex flex-col gap-3 rounded-lg border p-4'>
          <p className='text-sm'>
            Start your subscription to invite human operators to this project.
          </p>
          <CheckoutButton projectId={projectId} projectSlug={projectSlug} />
        </div>
      )}

      <p className='text-muted-foreground text-xs'>
        To change seats, update your card, or cancel — open the &ldquo;Manage
        subscription&rdquo; link in your latest Paddle billing email.
      </p>
    </div>
  )
}
