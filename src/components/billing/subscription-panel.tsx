'use client'

import { CancellationControls } from '@/components/billing/cancellation-controls'
import { SeatQuotaControl } from '@/components/billing/seat-quota-control'
import { StartCheckout } from '@/components/billing/start-checkout'
import { SubscriptionReadout } from '@/components/billing/subscription-readout'
import { useActiveProjectSubscription } from '@/hooks/use-active-project-subscription'
import { useProjectSubscriptionStream } from '@/hooks/use-project-subscription-stream'

type SubscriptionPanelProps = {
  projectSlug: string
}

export function SubscriptionPanel({ projectSlug }: SubscriptionPanelProps) {
  useProjectSubscriptionStream(projectSlug)
  const { data, isLoading, error } = useActiveProjectSubscription(projectSlug)

  const polarSubscription = data?.subscription?.polarSubscription ?? null
  const usedSeats = data?.usedSeats ?? 0
  const isSeatExhausted = data?.isSeatExhausted ?? false
  const projectStatus = data?.projectStatus ?? 'free'

  return (
    <div className='flex flex-col gap-6'>
      {isLoading || data == null ? (
        <div className='text-muted-foreground py-8 text-center text-sm'>
          {error != null ? 'Failed to load subscription.' : 'Loading…'}
        </div>
      ) : polarSubscription == null ? (
        <SubscriptionReadout
          polarSubscription={null}
          usedSeats={usedSeats}
          projectStatus={projectStatus}
        >
          <p className='text-muted-foreground text-sm'>
            This project is on the Free plan — a single operator with no
            additional seats. Upgrade to Pro to invite teammates.
          </p>
          <StartCheckout projectSlug={projectSlug} />
        </SubscriptionReadout>
      ) : (
        <>
          <SubscriptionReadout
            polarSubscription={polarSubscription}
            usedSeats={usedSeats}
            projectStatus={projectStatus}
          />
          <SeatQuotaControl
            projectSlug={projectSlug}
            seats={polarSubscription.seats ?? 1}
            usedSeats={usedSeats}
            isSeatExhausted={isSeatExhausted}
            currentPeriodStart={polarSubscription.currentPeriodStart}
            currentPeriodEnd={polarSubscription.currentPeriodEnd}
          />
          <CancellationControls
            projectSlug={projectSlug}
            polarSubscription={polarSubscription}
          />
        </>
      )}
    </div>
  )
}
