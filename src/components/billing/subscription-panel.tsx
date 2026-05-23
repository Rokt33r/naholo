'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { CancellationControls } from '@/components/billing/cancellation-controls'
import { SeatQuotaControl } from '@/components/billing/seat-quota-control'
import { StartCheckout } from '@/components/billing/start-checkout'
import { StartTrial } from '@/components/billing/start-trial'
import { SubscriptionReadout } from '@/components/billing/subscription-readout'
import { useActiveProjectSubscription } from '@/hooks/use-active-project-subscription'
import { useProjectSubscriptionStream } from '@/hooks/use-project-subscription-stream'
import { formatSeatPriceCopy } from '@/lib/billing-pricing'

type SubscriptionPanelProps = {
  projectSlug: string
}

export function SubscriptionPanel({ projectSlug }: SubscriptionPanelProps) {
  useProjectSubscriptionStream(projectSlug)
  const { data, isLoading, error } = useActiveProjectSubscription(projectSlug)

  const polarSubscription = data?.subscription?.polarSubscription ?? null
  const usedSeats = data?.usedSeats ?? 0
  const isSeatExhausted = data?.isSeatExhausted ?? false
  const trialCredit = data?.currentUserTrialCredit ?? 'spent'

  return (
    <section className='flex flex-col gap-3'>
      <p className='text-muted-foreground text-sm'>{formatSeatPriceCopy()}</p>

      {isLoading || data == null ? (
        <div className='text-muted-foreground py-8 text-center text-sm'>
          {error != null ? 'Failed to load subscription.' : 'Loading…'}
        </div>
      ) : polarSubscription == null ? (
        <SubscriptionReadout polarSubscription={null} usedSeats={usedSeats}>
          <div className='grid gap-3 sm:grid-cols-2'>
            {trialCredit === 'unused' && (
              <StartTrial projectSlug={projectSlug} />
            )}
            <StartCheckout projectSlug={projectSlug} />
          </div>
        </SubscriptionReadout>
      ) : (
        <div className='flex flex-col gap-3'>
          <SubscriptionReadout
            polarSubscription={polarSubscription}
            usedSeats={usedSeats}
          />
          {isSeatExhausted && (
            <Alert>
              <AlertDescription>
                Seat quota reached. Raise the seat count to add more operators.
              </AlertDescription>
            </Alert>
          )}
          <SeatQuotaControl
            projectSlug={projectSlug}
            seats={polarSubscription.seats ?? 1}
            usedSeats={usedSeats}
            currentPeriodStart={polarSubscription.currentPeriodStart}
            currentPeriodEnd={polarSubscription.currentPeriodEnd}
          />
          <CancellationControls
            projectSlug={projectSlug}
            polarSubscription={polarSubscription}
          />
        </div>
      )}
    </section>
  )
}
