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
  const isOnSubscriptionPage = pathname?.endsWith('/subscription') ?? false

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
    return <>{children}</>
  }

  if (data.status === 'incomplete') {
    if (isAdmin) {
      return (
        <div className='flex h-full items-center justify-center'>
          <div className='flex max-w-md flex-col items-center gap-4 rounded-lg border p-6 text-center'>
            <h2 className='text-lg font-semibold'>Finish payment setup</h2>
            <p className='text-muted-foreground text-sm'>
              Complete checkout to unlock this project.
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

  if (
    data.status === 'past_due' ||
    data.status === 'paused' ||
    data.status === 'canceled'
  ) {
    return (
      <div className='flex h-full flex-col'>
        <div className='flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'>
          <SubscriptionStatusBadge status={data.status} />
          <span>
            Update billing via the &ldquo;Manage subscription&rdquo; link in
            your latest Paddle email to restore write access.
          </span>
          {isAdmin && (
            <Link
              href={`/app/projects/${projectSlug}/subscription`}
              className='ml-auto underline'
            >
              Manage subscription
            </Link>
          )}
        </div>
        <div className='flex-1 overflow-hidden'>{children}</div>
      </div>
    )
  }

  return <>{children}</>
}
