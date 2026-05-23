'use client'

import { CreditCard } from 'lucide-react'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { SubscriptionPanel } from '@/components/billing/subscription-panel'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { publicConfig } from '@/lib/publicConfig'

export default function SubscriptionIndexPage() {
  const { projectSlug, currentOperator } = useProjectContext()
  const isMobile = useIsMobile()
  const isAdmin = currentOperator.role === 'admin'

  if (!publicConfig.billing) {
    return null
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-2 px-2 pt-2 h-10'>
        {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
        <h2 className='flex flex-1 items-center gap-2 px-2 font-semibold'>
          <CreditCard className='size-5' />
          Subscription
        </h2>
      </div>

      <div className='flex-1 overflow-y-auto'>
        <div className='flex w-full max-w-2xl flex-col gap-6 p-4'>
          {isAdmin ? (
            <SubscriptionPanel projectSlug={projectSlug} />
          ) : (
            <p className='text-sm text-muted-foreground'>
              Ask a project admin to manage this project&rsquo;s subscription.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
