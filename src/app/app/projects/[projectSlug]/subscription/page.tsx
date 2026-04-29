'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { CheckoutEventNames } from '@paddle/paddle-js'
import type { PaddleEventData } from '@paddle/paddle-js'
import { Button } from '@/components/ui/button'
import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
import { useProjectContext } from '@/components/app/project-context'
import {
  useProjectSubscription,
  type ProjectSubscriptionView,
} from '@/hooks/use-project-subscription'
import {
  initializePaddle,
  subscribePaddleEvents,
} from '@/lib/billing/paddle-browser'
import { mutationFetch } from '@/lib/fetcher'

const FRAME_CLASS = 'paddle-checkout-frame'
const FINALIZE_RETRY_DELAYS_MS = [500, 1000, 1500, 2000, 2500, 3000]

export default function ProjectSubscriptionPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>()
  const { projectId, currentOperator } = useProjectContext()
  const isAdmin = currentOperator.role === 'admin'
  const { data, isLoading } = useProjectSubscription(projectSlug)
  const queryClient = useQueryClient()
  const frameRef = useRef<HTMLDivElement>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [finalized, setFinalized] = useState(false)

  const status = data?.status ?? null
  const isActive =
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due' ||
    status === 'paused'

  const shouldMountCheckout = isAdmin && data != null && !isActive && !finalized

  useEffect(() => {
    if (!shouldMountCheckout) {
      return
    }
    if (frameRef.current == null) {
      return
    }

    let cancelled = false

    const finalize = async (transactionId: string) => {
      if (cancelled) {
        return
      }
      setFinalizing(true)
      setFinalizeError(null)
      let attempt = 0
      while (!cancelled) {
        try {
          const res = await mutationFetch(
            `/api/projects/${projectSlug}/billing/finalize-checkout`,
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ transactionId }),
            },
          )
          if (res.ok) {
            await queryClient.invalidateQueries({
              queryKey: ['project-subscription', projectSlug],
            })
            if (!cancelled) {
              setFinalized(true)
              setFinalizing(false)
            }
            return
          }
          if (res.status === 409 && attempt < FINALIZE_RETRY_DELAYS_MS.length) {
            const delay = FINALIZE_RETRY_DELAYS_MS[attempt]
            attempt++
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }
          await queryClient.invalidateQueries({
            queryKey: ['project-subscription', projectSlug],
          })
          if (!cancelled) {
            setFinalizing(false)
            setFinalizeError(
              'Subscription is taking longer than expected to confirm. It will appear here shortly.',
            )
          }
          return
        } catch (error) {
          console.error('finalize-checkout request failed', error)
          if (!cancelled) {
            setFinalizing(false)
            setFinalizeError(
              error instanceof Error
                ? error.message
                : 'Failed to finalize checkout',
            )
          }
          return
        }
      }
    }

    const handlePaddleEvent = (event: PaddleEventData) => {
      if (event.name !== CheckoutEventNames.CHECKOUT_COMPLETED) {
        return
      }
      const transactionId = event.data?.transaction_id
      if (transactionId == null || transactionId === '') {
        console.error('checkout.completed event had no transaction_id', event)
        setFinalizeError(
          'Checkout completed but no transaction id was returned.',
        )
        return
      }
      void finalize(transactionId)
    }

    const unsubscribe = subscribePaddleEvents(handlePaddleEvent)

    void (async () => {
      try {
        const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
        if (priceId == null || priceId === '') {
          throw new Error('NEXT_PUBLIC_PADDLE_PRICE_ID is not set')
        }
        const paddle = await initializePaddle()
        if (cancelled) {
          return
        }
        if (paddle == null) {
          throw new Error('Paddle failed to initialize')
        }
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customData: { projectId },
          settings: {
            displayMode: 'inline',
            frameTarget: FRAME_CLASS,
            frameInitialHeight: 600,
            frameStyle:
              'width: 100%; min-width: 312px; background-color: transparent; border: none;',
          },
        })
      } catch (error) {
        console.error('Failed to open inline checkout', error)
        if (!cancelled) {
          setFinalizeError(
            error instanceof Error ? error.message : 'Failed to open checkout',
          )
        }
      }
    })()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [shouldMountCheckout, projectId, projectSlug, queryClient])

  if (isLoading || data == null) {
    return <div className='text-muted-foreground p-8 text-sm'>Loading…</div>
  }

  if (!isAdmin && !isActive) {
    return (
      <div className='flex h-full items-center justify-center p-6'>
        <div className='flex max-w-md flex-col items-center gap-4 rounded-lg border p-6 text-center'>
          <h2 className='text-lg font-semibold'>Subscription</h2>
          <p className='text-muted-foreground text-sm'>
            Only project admins can manage this project&rsquo;s subscription.
            Ask a project admin to set up billing.
          </p>
          <Button asChild variant='outline'>
            <Link href={`/app/projects/${projectSlug}`}>Back to project</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (isActive) {
    return (
      <div className='mx-auto flex w-full max-w-2xl flex-col gap-6 p-6'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-xl font-semibold'>Subscription active</h1>
          <p className='text-muted-foreground text-sm'>
            Update seats, change your card, or cancel via the &ldquo;Manage
            subscription&rdquo; link in your latest Paddle billing email.
          </p>
        </div>

        <SubscriptionReadout data={data} />

        <Button asChild variant='outline' className='self-start'>
          <Link href={`/app/projects/${projectSlug}`}>Back to project</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 p-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-xl font-semibold'>
          {finalized ? 'Subscription started' : 'Start your subscription'}
        </h1>
        <p className='text-muted-foreground text-sm'>
          $5 per human operator per month + VAT. Bots are always free.
        </p>
      </div>

      <SubscriptionReadout data={data} />

      {finalized ? (
        <div className='flex flex-col gap-3 rounded-lg border p-4'>
          <p className='text-sm'>
            Your subscription is set up. You can now invite human operators to
            this project.
          </p>
          <Button asChild className='self-start'>
            <Link href={`/app/projects/${projectSlug}`}>Go to project</Link>
          </Button>
        </div>
      ) : (
        <>
          {finalizeError != null && (
            <div className='rounded-lg border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'>
              {finalizeError}
            </div>
          )}
          {finalizing && (
            <div className='text-muted-foreground text-sm'>
              Finalizing subscription…
            </div>
          )}
          <div ref={frameRef} className={`${FRAME_CLASS} min-h-[600px]`} />
        </>
      )}
    </div>
  )
}

function SubscriptionReadout({ data }: { data: ProjectSubscriptionView }) {
  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Status</span>
        <SubscriptionStatusBadge status={data.status} />
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Seats</span>
        <span className='font-medium'>
          {data.usedSeats} / {data.seatQuantity} used
        </span>
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Trial ends</span>
        <span className='font-medium'>{formatDate(data.trialEndsAt)}</span>
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Next billing</span>
        <span className='font-medium'>{formatDate(data.currentPeriodEnd)}</span>
      </div>
    </div>
  )
}

function formatDate(value: string | null): string {
  if (value == null) {
    return '—'
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return '—'
  }
  return d.toLocaleDateString()
}
