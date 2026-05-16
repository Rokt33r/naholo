'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, redirect } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { CheckoutEventNames } from '@paddle/paddle-js'
import type { Paddle, PaddleEventData } from '@paddle/paddle-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SubscriptionStatusBadge } from '@/components/billing/subscription-status-badge'
import { useProjectContext } from '@/components/app/project-context'
import {
  useActiveProjectSubscription,
  type ActiveProjectSubscriptionResponse,
} from '@/hooks/use-active-project-subscription'
import {
  initializePaddle,
  subscribePaddleEvents,
} from '@/lib/billing/paddle-browser'
import { fetchProjectSubscriptionCheckoutToken } from '@/lib/billing/checkout-token-client'
import { publicConfig, requirePaddlePublicConfig } from '@/lib/publicConfig'

const FRAME_CLASS = 'paddle-checkout-frame'
const AWAITING_WEBHOOK_BANNER_MS = 5 * 60 * 1000

type CheckoutState =
  | { phase: 'idle' }
  | { phase: 'issuing' }
  | {
      phase: 'open'
      expiresAt: Date
      awaitingWebhook: boolean
      completedAt: Date | null
    }
  | { phase: 'expired' }
  | { phase: 'error'; message: string }

function humanizeTokenError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('403')) {
      return 'Only admin operators can start checkout.'
    }
    return error.message
  }
  return 'Failed to start checkout.'
}

export default function ProjectSubscriptionPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>()
  if (!publicConfig.billing) {
    redirect(`/app/projects/${projectSlug}`)
  }
  const { projectId, currentOperator } = useProjectContext()
  const isAdmin = currentOperator.role === 'admin'
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    phase: 'idle',
  })
  const awaitingWebhook =
    checkoutState.phase === 'open' && checkoutState.awaitingWebhook
  const { data, isLoading } = useActiveProjectSubscription(projectSlug, {
    awaitingWebhook,
  })
  const queryClient = useQueryClient()
  const frameRef = useRef<HTMLDivElement>(null)
  const paddleRef = useRef<Paddle | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const status = data?.subscription?.paddleSubscription.status ?? null
  const isActive =
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due' ||
    status === 'paused'

  useEffect(() => {
    if (isActive && checkoutState.phase === 'open') {
      try {
        paddleRef.current?.Checkout.close()
      } catch (error) {
        console.error('Failed to close Paddle checkout', error)
      }
      setCheckoutState({ phase: 'idle' })
    }
  }, [isActive, checkoutState.phase])

  useEffect(() => {
    if (checkoutState.phase !== 'open') {
      return
    }
    const expiresAt = checkoutState.expiresAt
    const timeoutMs = Math.max(0, expiresAt.getTime() - Date.now())
    const timer = window.setTimeout(() => {
      try {
        paddleRef.current?.Checkout.close()
      } catch (error) {
        console.error('Failed to close Paddle checkout on expiry', error)
      }
      setCheckoutState({ phase: 'expired' })
    }, timeoutMs)

    const unsubscribe = subscribePaddleEvents((event: PaddleEventData) => {
      if (event.name !== CheckoutEventNames.CHECKOUT_COMPLETED) {
        return
      }
      setCheckoutState((prev) => {
        if (prev.phase !== 'open') {
          return prev
        }
        return { ...prev, awaitingWebhook: true, completedAt: new Date() }
      })
      queryClient.invalidateQueries({
        queryKey: ['active-project-subscription', projectSlug],
      })
    })

    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [checkoutState, projectSlug, queryClient])

  useEffect(() => {
    if (checkoutState.phase !== 'open' || !checkoutState.awaitingWebhook) {
      return
    }
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 5000)
    return () => {
      window.clearInterval(interval)
    }
  }, [checkoutState])

  const handleStartCheckout = async () => {
    setCheckoutState({ phase: 'issuing' })
    let token: string
    let expiresAt: Date
    try {
      const res = await fetchProjectSubscriptionCheckoutToken(projectSlug)
      token = res.token
      expiresAt = res.expiresAt
    } catch (error) {
      console.error('Failed to issue checkout token', error)
      setCheckoutState({
        phase: 'error',
        message: humanizeTokenError(error),
      })
      return
    }

    try {
      const { priceId } = requirePaddlePublicConfig()
      const paddle = await initializePaddle()
      if (paddle == null) {
        throw new Error('Paddle failed to initialize')
      }
      paddleRef.current = paddle
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { projectSubscriptionCheckoutToken: token },
        settings: {
          displayMode: 'inline',
          frameTarget: FRAME_CLASS,
          frameInitialHeight: 600,
          frameStyle:
            'width: 100%; min-width: 312px; background-color: transparent; border: none;',
        },
      })
      setCheckoutState({
        phase: 'open',
        expiresAt,
        awaitingWebhook: false,
        completedAt: null,
      })
    } catch (error) {
      console.error('Failed to open inline checkout', error)
      setCheckoutState({
        phase: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to open checkout.',
      })
    }
  }

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

  const showStillWaitingBanner =
    checkoutState.phase === 'open' &&
    checkoutState.awaitingWebhook &&
    checkoutState.completedAt != null &&
    now - checkoutState.completedAt.getTime() > AWAITING_WEBHOOK_BANNER_MS

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 p-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-xl font-semibold'>Start your subscription</h1>
        <p className='text-muted-foreground text-sm'>
          $5 per human operator per month + VAT. Bots are always free.
        </p>
      </div>

      <SubscriptionReadout data={data} />

      {(checkoutState.phase === 'idle' ||
        checkoutState.phase === 'issuing' ||
        checkoutState.phase === 'expired' ||
        checkoutState.phase === 'error') && (
        <div className='flex flex-col gap-3 rounded-lg border p-4'>
          {checkoutState.phase === 'expired' && (
            <Alert variant='destructive'>
              <AlertDescription>
                This checkout session has expired. Click the button to start a
                new one.
              </AlertDescription>
            </Alert>
          )}
          {checkoutState.phase === 'error' && (
            <Alert variant='destructive'>
              <AlertDescription>{checkoutState.message}</AlertDescription>
            </Alert>
          )}
          <p className='text-muted-foreground text-sm'>
            This checkout session is valid for 1 hour.
          </p>
          <Button
            onClick={handleStartCheckout}
            disabled={checkoutState.phase === 'issuing'}
            className='self-start'
          >
            {checkoutState.phase === 'issuing' ? 'Starting…' : 'Start checkout'}
          </Button>
        </div>
      )}

      {checkoutState.phase === 'open' && checkoutState.awaitingWebhook && (
        <div className='text-muted-foreground text-sm'>
          Finalizing subscription…
        </div>
      )}
      {showStillWaitingBanner && (
        <Alert>
          <AlertDescription>
            Still waiting for Paddle confirmation. Refresh in a moment.
          </AlertDescription>
        </Alert>
      )}
      <div
        ref={frameRef}
        className={`${FRAME_CLASS} ${
          checkoutState.phase === 'open' ? 'min-h-[600px]' : ''
        }`}
      />
    </div>
  )
}

function SubscriptionReadout({
  data,
}: {
  data: ActiveProjectSubscriptionResponse
}) {
  const sub = data.subscription
  const paddle = sub?.paddleSubscription ?? null
  const status = paddle?.status ?? null
  const seatQuantity = paddle?.seatQuantity ?? 0
  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Status</span>
        <SubscriptionStatusBadge status={status} />
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Seats</span>
        <span className='font-medium'>
          {data.usedSeats} / {seatQuantity} used
        </span>
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Trial ends</span>
        <span className='font-medium'>{formatDate(paddle?.trialEndsAt)}</span>
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Next billing</span>
        <span className='font-medium'>
          {formatDate(paddle?.currentPeriodEnd)}
        </span>
      </div>
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
