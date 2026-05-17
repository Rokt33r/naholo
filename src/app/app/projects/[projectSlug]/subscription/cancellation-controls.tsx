'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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

type PaddleSubscription = NonNullable<
  NonNullable<
    ActiveProjectSubscriptionResponse['subscription']
  >['paddleSubscription']
>

export function CancellationControls({
  projectSlug,
  paddleSubscription,
}: {
  projectSlug: string
  paddleSubscription: PaddleSubscription
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const mutation = useUpdateSubscriptionCancellation(projectSlug)

  const cancellationScheduled =
    paddleSubscription.cancelAt != null &&
    paddleSubscription.status !== 'canceled'

  if (cancellationScheduled) {
    return (
      <div className='flex flex-col gap-3 rounded-lg border p-4'>
        <Alert>
          <AlertDescription>
            Subscription will end on {formatDate(paddleSubscription.cancelAt)}.
            You can resume any time before then to keep your seats.
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
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-sm font-medium'>Cancel subscription</h2>
        <p className='text-muted-foreground text-sm'>
          You&rsquo;ll keep access until the end of your current billing period
          on {formatDate(paddleSubscription.currentPeriodEnd)}.
        </p>
      </div>
      {mutation.error != null && (
        <Alert variant='destructive'>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      )}
      <Button
        variant='outline'
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
              {formatDate(paddleSubscription.currentPeriodEnd)}. You can resume
              before then to keep your seats. Renewal will stop after that date.
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
    </div>
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
