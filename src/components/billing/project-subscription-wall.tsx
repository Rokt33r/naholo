'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CancellationControls } from '@/components/billing/cancellation-controls'
import { StartCheckout } from '@/components/billing/start-checkout'
import { SubscriptionReadout } from '@/components/billing/subscription-readout'
import { useProjectContext } from '@/components/app/project-context'
import { useActiveProjectSubscription } from '@/hooks/use-active-project-subscription'
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
  const [awaitingWebhook, setAwaitingWebhook] = useState(false)
  const { data, isLoading, error, refetch, isFetching } =
    useActiveProjectSubscription(projectSlug, { awaitingWebhook })

  const isAdmin = currentOperator.role === 'admin'
  const status = data?.subscription?.polarSubscription?.status ?? null
  const isActive =
    status === 'active' || status === 'trialing' || status === 'past_due'

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

  if (isActive) {
    return <>{children}</>
  }

  if (!isAdmin) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex max-w-md flex-col items-center gap-3 rounded-lg border p-6 text-center'>
          <p className='text-muted-foreground text-sm'>
            Ask a project admin to set up the subscription before this project
            becomes available.
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

  return (
    <div className='h-full overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-2xl flex-col gap-6 p-6'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-xl font-semibold'>
            {status === 'incomplete' || status == null
              ? 'Start your subscription'
              : 'Subscription inactive'}
          </h1>
          <p className='text-muted-foreground text-sm'>
            $5 per human operator per month + VAT. Bots are always free.
          </p>
        </div>

        <SubscriptionReadout
          polarSubscription={data.subscription?.polarSubscription ?? null}
          usedSeats={data.usedSeats}
        />

        {data.subscription?.polarSubscription != null && (
          <CancellationControls
            projectSlug={projectSlug}
            polarSubscription={data.subscription.polarSubscription}
          />
        )}

        <StartCheckout
          projectSlug={projectSlug}
          onWaitingChange={setAwaitingWebhook}
        />
      </div>
    </div>
  )
}
