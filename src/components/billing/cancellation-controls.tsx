'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useUpdateSubscriptionCancellation,
  type ActiveProjectSubscriptionResponse,
} from '@/hooks/use-active-project-subscription'

type PolarSubscription = NonNullable<
  NonNullable<
    ActiveProjectSubscriptionResponse['subscription']
  >['polarSubscription']
>

export function CancellationControls({
  projectSlug,
  polarSubscription,
}: {
  projectSlug: string
  polarSubscription: PolarSubscription
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const mutation = useUpdateSubscriptionCancellation(projectSlug)

  const cancellationScheduled =
    polarSubscription.cancelAtPeriodEnd &&
    polarSubscription.status !== 'canceled'

  if (cancellationScheduled) {
    return (
      <Card>
        <CardContent className='flex flex-col gap-3'>
          <Alert>
            <AlertDescription>
              Subscription will end on{' '}
              {formatDate(polarSubscription.currentPeriodEnd)}. You can resume
              any time before then to keep your seats.
            </AlertDescription>
          </Alert>
          {mutation.error != null && (
            <Alert variant='destructive'>
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={() => mutation.mutate('resume')}
            disabled={mutation.isPending}
            className='self-start'
          >
            {mutation.isPending ? 'Resuming…' : 'Resume subscription'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='border-destructive/50'>
      <CardHeader>
        <CardTitle>Cancel subscription</CardTitle>
        <CardDescription>
          You&rsquo;ll keep access until the end of your current billing period
          on {formatDate(polarSubscription.currentPeriodEnd)}.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {mutation.error != null && (
          <Alert variant='destructive'>
            <AlertDescription>{mutation.error.message}</AlertDescription>
          </Alert>
        )}
        <Button
          variant='destructive'
          onClick={() => setConfirmOpen(true)}
          disabled={mutation.isPending}
          className='self-start'
        >
          Cancel subscription
        </Button>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel subscription?</DialogTitle>
              <DialogDescription>
                The subscription will end on{' '}
                {formatDate(polarSubscription.currentPeriodEnd)}. You can resume
                before then to keep your seats. Renewal will stop after that
                date.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline'>Keep subscription</Button>
              </DialogClose>
              <Button
                variant='destructive'
                onClick={() =>
                  mutation.mutate('cancel', {
                    onSuccess: () => setConfirmOpen(false),
                  })
                }
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Cancelling…' : 'Cancel subscription'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
