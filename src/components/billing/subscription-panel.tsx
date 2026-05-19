'use client'

import { CreditCard } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

  return (
    <section className='flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        <CreditCard className='size-5' />
        <h2 className='text-lg font-semibold'>Subscription</h2>
      </div>
      <p className='text-muted-foreground text-sm'>
        $5 per human operator per month + VAT. Bots are always free.
      </p>

      {isLoading || data == null ? (
        <div className='text-muted-foreground py-8 text-center text-sm'>
          {error != null ? 'Failed to load subscription.' : 'Loading…'}
        </div>
      ) : (
        <SubscriptionPanelBody
          projectSlug={projectSlug}
          polarSubscription={data.subscription?.polarSubscription ?? null}
          usedSeats={data.usedSeats}
          isSeatExhausted={data.isSeatExhausted}
        />
      )}
    </section>
  )
}

type PolarSubscription = NonNullable<
  Parameters<typeof SubscriptionReadout>[0]['polarSubscription']
>

function SubscriptionPanelBody({
  projectSlug,
  polarSubscription,
  usedSeats,
  isSeatExhausted,
}: {
  projectSlug: string
  polarSubscription: PolarSubscription | null
  usedSeats: number
  isSeatExhausted: boolean
}) {
  if (polarSubscription == null) {
    return (
      <div className='flex flex-col gap-3'>
        <SubscriptionReadout polarSubscription={null} usedSeats={usedSeats} />
        <StartCheckout projectSlug={projectSlug} />
      </div>
    )
  }

  return (
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
      />
      <CancellationControls
        projectSlug={projectSlug}
        polarSubscription={polarSubscription}
      />
    </div>
  )
}
