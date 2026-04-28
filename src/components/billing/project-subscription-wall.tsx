'use client'

import { CheckoutButton } from '@/components/billing/checkout-button'
import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
import { useProjectContext } from '@/components/app/project-context'
import { useProjectSubscription } from '@/hooks/use-project-subscription'

type ProjectSubscriptionWallProps = {
  children: React.ReactNode
}

export function ProjectSubscriptionWall({
  children,
}: ProjectSubscriptionWallProps) {
  const { projectId, projectSlug } = useProjectContext()
  const { data, isLoading } = useProjectSubscription(projectSlug)

  if (isLoading || data == null) {
    return <>{children}</>
  }

  if (data.status === 'incomplete') {
    if (data.isBillingUser) {
      return (
        <div className='flex h-full items-center justify-center'>
          <div className='flex max-w-md flex-col items-center gap-4 rounded-lg border p-6 text-center'>
            <h2 className='text-lg font-semibold'>Finish payment setup</h2>
            <p className='text-sm text-muted-foreground'>
              Complete checkout to unlock this project.
            </p>
            <CheckoutButton projectId={projectId} projectSlug={projectSlug} />
          </div>
        </div>
      )
    }
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='max-w-md text-center text-sm text-muted-foreground'>
          The project owner needs to complete payment setup before this project
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
        </div>
        <div className='flex-1 overflow-hidden'>{children}</div>
      </div>
    )
  }

  return <>{children}</>
}
