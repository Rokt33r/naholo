import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
import type { ActiveProjectSubscriptionResponse } from '@/hooks/use-active-project-subscription'
import { ExternalLink } from 'lucide-react'
import { publicConfig } from '@/lib/publicConfig'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

type PolarSubscription = NonNullable<
  ActiveProjectSubscriptionResponse['subscription']
>['polarSubscription']

type ProjectStatus = ActiveProjectSubscriptionResponse['projectStatus']

export function SubscriptionReadout({
  polarSubscription,
  usedSeats,
  projectStatus,
  hidePortalLink = false,
  children,
}: {
  polarSubscription: PolarSubscription | null
  usedSeats: number
  projectStatus: ProjectStatus
  hidePortalLink?: boolean
  children?: React.ReactNode
}) {
  const seats = polarSubscription?.seats

  const portalUrl = publicConfig.polar?.portalUrl

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current subscription</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='divide-y'>
          <div className='flex items-center justify-between py-2.5 text-sm first:pt-0'>
            <span className='text-muted-foreground'>Status</span>
            <SubscriptionStatusBadge status={projectStatus} />
          </div>
          <div className='flex items-center justify-between py-2.5 text-sm'>
            <span className='text-muted-foreground'>Seats</span>
            <span className='font-medium'>
              {usedSeats} / {seats ?? '—'} used
            </span>
          </div>
          <div className='flex items-center justify-between py-2.5 text-sm'>
            <span className='text-muted-foreground'>Next billing</span>
            <span className='font-medium'>
              {formatDate(polarSubscription?.currentPeriodEnd)}
            </span>
          </div>
        </div>
        {polarSubscription != null && !hidePortalLink && (
          <>
            <hr />
            <div>
              <Button asChild variant='outline' className='mb-2 self-start'>
                <a href={portalUrl} target='_blank' rel='noopener noreferrer'>
                  Open Polar portal
                  <ExternalLink className='size-4' />
                </a>
              </Button>
              <p className='text-muted-foreground text-sm'>
                Download invoices and change your payment method from the Polar
                portal. Sign in with the billing email for this subscription.
              </p>
            </div>
          </>
        )}
        {children != null && (
          <>
            <hr />
            <div className='flex flex-col gap-3'>{children}</div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function formatDate(value: string | null | undefined): string {
  if (value == null) {
    return '—'
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return '—'
  }
  return d.toLocaleDateString()
}
