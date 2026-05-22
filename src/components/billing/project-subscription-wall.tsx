'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CancellationControls } from '@/components/billing/cancellation-controls'
import { StartCheckout } from '@/components/billing/start-checkout'
import { StartTrial } from '@/components/billing/start-trial'
import { SubscriptionReadout } from '@/components/billing/subscription-readout'
import { useProjectContext } from '@/components/app/project-context'
import { useActiveProjectSubscription } from '@/hooks/use-active-project-subscription'
import { useProjectSubscriptionStream } from '@/hooks/use-project-subscription-stream'
import { formatSeatPriceCopy } from '@/lib/billing-pricing'
import { publicConfig } from '@/lib/publicConfig'

type ProjectSubscriptionWallProps = {
  children: React.ReactNode
}

export function ProjectSubscriptionWall({
  children,
}: ProjectSubscriptionWallProps) {
  if (!publicConfig.billing) {
    return <>{children}</>
  }
  const { projectSlug, currentOperator } = useProjectContext()
  useProjectSubscriptionStream(projectSlug)
  const { data, isLoading, error, refetch, isFetching } =
    useActiveProjectSubscription(projectSlug)

  const isAdmin = currentOperator.role === 'admin'
  const polarSubscription = data?.subscription?.polarSubscription ?? null
  const status = polarSubscription?.status ?? null
  const projectStatus = data?.projectStatus ?? 'inactive'
  const isActive = projectStatus === 'active' || projectStatus === 'trial'
  const seatsExhausted = projectStatus === 'seats-exceeded'
  const usedSeats = data?.usedSeats ?? 0
  const trialCredit = data?.currentUserTrialCredit ?? 'spent'

  if (error != null) {
    return (
      <div className='flex h-full items-center justify-center p-6'>
        <div className='flex max-w-md flex-col items-center gap-3 rounded-lg border p-6 text-center'>
          <h2 className='text-lg font-semibold'>Subscription unavailable</h2>
          <p className='text-muted-foreground text-sm'>
            We couldn&rsquo;t load this project&rsquo;s subscription status.
            Refresh to try again, or contact support if the problem persists.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || data == null) {
    return <div className='h-full w-full' aria-busy='true' />
  }

  if (isActive && !seatsExhausted) {
    return <>{children}</>
  }

  if (!isAdmin) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex max-w-md flex-col items-center gap-3 rounded-lg border p-6 text-center'>
          <p className='text-muted-foreground text-sm'>
            {seatsExhausted
              ? 'This project has reached its seat limit. Ask a project admin to raise the seat count.'
              : 'Ask a project admin to set up the subscription before this project becomes available.'}
          </p>
          <Button
            variant='outline'
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing…' : 'Refresh status'}
          </Button>
        </div>
      </div>
    )
  }

  const seatLimitWall = seatsExhausted

  return (
    <div className='h-full overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-2xl flex-col gap-6 p-6'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-xl font-semibold'>
            {seatLimitWall
              ? 'Seat limit reached'
              : status === 'incomplete' || status == null
                ? 'Start your subscription'
                : 'Subscription inactive'}
          </h1>
          <p className='text-muted-foreground text-sm'>
            {seatLimitWall
              ? 'All seats on this subscription are in use. Raise the seat count from the operators page to continue using this project.'
              : formatSeatPriceCopy()}
          </p>
        </div>

        <SubscriptionReadout
          polarSubscription={polarSubscription}
          usedSeats={usedSeats}
        />

        {polarSubscription != null && !seatLimitWall && (
          <CancellationControls
            projectSlug={projectSlug}
            polarSubscription={polarSubscription}
          />
        )}

        {seatLimitWall ? (
          <Button asChild className='self-start'>
            <Link href={`/app/projects/${projectSlug}/operators`}>
              Manage subscription
            </Link>
          </Button>
        ) : (
          <>
            {trialCredit === 'unused' && (
              <StartTrial projectSlug={projectSlug} />
            )}
            <StartCheckout projectSlug={projectSlug} />
          </>
        )}
      </div>
    </div>
  )
}
