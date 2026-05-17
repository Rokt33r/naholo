'use client'

import { ManageSubscriptionBlock } from '@/components/billing/manage-subscription-block'
import { SubscriptionReadout } from '@/components/billing/subscription-readout'
import { useProjectContext } from '@/components/app/project-context'
import { useActiveProjectSubscription } from '@/hooks/use-active-project-subscription'

export function BillingTab() {
  const { projectSlug } = useProjectContext()
  const { data, isLoading, error } = useActiveProjectSubscription(projectSlug)

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>Billing</h3>
        <p className='text-muted-foreground text-sm'>
          $5 per human operator per month + VAT. Bots are always free.
        </p>
      </div>

      {isLoading || data == null ? (
        <div className='text-muted-foreground py-8 text-center text-sm'>
          {error != null ? 'Failed to load subscription.' : 'Loading…'}
        </div>
      ) : (
        <SubscriptionReadout
          polarSubscription={data.subscription?.polarSubscription ?? null}
          usedSeats={data.usedSeats}
        />
      )}

      <ManageSubscriptionBlock
        projectSlug={projectSlug}
        variant='default'
        className='self-start'
      />
    </div>
  )
}
