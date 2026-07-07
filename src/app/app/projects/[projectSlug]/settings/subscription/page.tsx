'use client'

import { useProjectContext } from '@/components/app/project-context'
import { SubscriptionPanel } from '@/components/billing/subscription-panel'
import { publicConfig } from '@/lib/publicConfig'

export default function SubscriptionIndexPage() {
  const { projectSlug, currentOperator } = useProjectContext()
  const isAdmin = currentOperator.role === 'admin'

  if (!publicConfig.billing) {
    return null
  }

  return (
    <div className='flex w-full max-w-2xl flex-col gap-6 p-4'>
      {isAdmin ? (
        <SubscriptionPanel projectSlug={projectSlug} />
      ) : (
        <p className='text-sm text-muted-foreground'>
          Ask a project admin to manage this project&rsquo;s subscription.
        </p>
      )}
    </div>
  )
}
