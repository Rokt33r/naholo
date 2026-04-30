'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
import { useProjectContext } from '@/components/app/project-context'
import { useProjectSubscription } from '@/hooks/use-project-subscription'

type ProjectSubscriptionWallProps = {
  children: React.ReactNode
}

export function ProjectSubscriptionWall({
  children,
}: ProjectSubscriptionWallProps) {
  const { projectSlug, currentOperator } = useProjectContext()
  const { data, isLoading, error } = useProjectSubscription(projectSlug)
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

  const isActive = data.status === 'active' || data.status === 'trialing'

  if (isActive) {
    return <>{children}</>
  }

  if (isAdmin) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex max-w-md flex-col items-center gap-4 rounded-lg border p-6 text-center'>
          {data.status != null && (
            <SubscriptionStatusBadge status={data.status} />
          )}
          <h2 className='text-lg font-semibold'>
            {data.status === 'incomplete' || data.status == null
              ? 'Finish payment setup'
              : 'Subscription inactive'}
          </h2>
          <p className='text-muted-foreground text-sm'>
            {data.status === 'incomplete' || data.status == null
              ? 'Complete checkout to unlock this project.'
              : 'Update billing to restore access to this project.'}
          </p>
          <Button asChild>
            <Link href={`/app/projects/${projectSlug}/subscription`}>
              Go to subscription page
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full items-center justify-center'>
      <p className='text-muted-foreground max-w-md text-center text-sm'>
        Ask a project admin to set up the subscription before this project
        becomes available.
      </p>
    </div>
  )
}
