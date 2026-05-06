'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
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
  const { data, isLoading, error, refetch, isFetching } =
    useActiveProjectSubscription(projectSlug)
  const pathname = usePathname()

  const isAdmin = currentOperator.role === 'admin'
  const subscriptionPathPrefix = `/app/projects/${projectSlug}/subscription`
  const isOnSubscriptionPage =
    pathname?.startsWith(subscriptionPathPrefix) ?? false

  if (isAdmin && isOnSubscriptionPage) {
    return <>{children}</>
  }

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

  const status = data.subscription?.paddleSubscription.status ?? null
  const isActive = status === 'active' || status === 'trialing'

  if (isActive) {
    return <>{children}</>
  }

  if (isAdmin) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex max-w-md flex-col items-center gap-4 rounded-lg border p-6 text-center'>
          {status != null && <SubscriptionStatusBadge status={status} />}
          <h2 className='text-lg font-semibold'>
            {status === 'incomplete' || status == null
              ? 'Finish payment setup'
              : 'Subscription inactive'}
          </h2>
          <p className='text-muted-foreground text-sm'>
            {status === 'incomplete' || status == null
              ? 'Complete checkout to unlock this project.'
              : 'Update billing to restore access to this project.'}
          </p>
          <div className='flex flex-col gap-2 self-stretch'>
            <Button asChild>
              <Link href={`/app/projects/${projectSlug}/subscription`}>
                Go to subscription page
              </Link>
            </Button>
            <Button
              variant='outline'
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Refreshing…' : 'Refresh status'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

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
