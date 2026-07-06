'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useProjectContext } from '@/components/app/project-context'
import { useActiveProjectSubscription } from '@/hooks/use-active-project-subscription'
import { useProjectSubscriptionStream } from '@/hooks/use-project-subscription-stream'
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
  const router = useRouter()
  const pathname = usePathname()
  const subscriptionPath = `/app/projects/${projectSlug}/subscription`
  const operatorsPath = `/app/projects/${projectSlug}/operators`
  const isOnRecoveryPage =
    pathname === subscriptionPath || pathname === operatorsPath

  useProjectSubscriptionStream(projectSlug)
  const { data, isLoading, error, refetch, isFetching } =
    useActiveProjectSubscription(projectSlug)

  const isAdmin = currentOperator.role === 'admin'
  const projectStatus = data?.projectStatus ?? 'free'
  const seatsExhausted = projectStatus === 'seats-exceeded'
  const isGated = projectStatus === 'suspended' || seatsExhausted
  const shouldGate = data != null && isGated

  useEffect(() => {
    if (shouldGate && isAdmin && !isOnRecoveryPage) {
      router.replace(subscriptionPath)
    }
  }, [shouldGate, isAdmin, isOnRecoveryPage, router, subscriptionPath])

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

  if (!isGated) {
    return <>{children}</>
  }

  if (isOnRecoveryPage) {
    return <>{children}</>
  }

  if (!isAdmin) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex max-w-md flex-col items-center gap-3 rounded-lg border p-6 text-center'>
          <p className='text-muted-foreground text-sm'>
            {seatsExhausted
              ? 'This project has reached its seat limit. Ask a project admin to raise the seat count.'
              : 'This project is suspended. Ask a project admin to fix the subscription or remove extra operators.'}
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

  return <div className='h-full w-full' aria-busy='true' />
}
