'use client'

import { useProjectContext } from '@/components/app/project-context'
import { SubscriptionPanel } from '@/components/billing/subscription-panel'
import { Card, CardContent } from '@/components/ui/card'
import { publicConfig } from '@/lib/publicConfig'

export default function SubscriptionIndexPage() {
  const { projectSlug, currentOperator } = useProjectContext()
  const isAdmin = currentOperator.role === 'admin'

  if (!publicConfig.billing) {
    return null
  }

  return isAdmin ? (
    <SubscriptionPanel projectSlug={projectSlug} />
  ) : (
    <Card>
      <CardContent>
        <p className='text-muted-foreground text-sm'>
          Ask a project admin to manage this project&rsquo;s subscription.
        </p>
      </CardContent>
    </Card>
  )
}
