'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, redirect } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import type { PolarEmbedCheckout } from '@polar-sh/checkout/embed'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useProjectContext } from '@/components/app/project-context'
import { useActiveProjectSubscription } from '@/hooks/use-active-project-subscription'
import type { SubscriptionDiscount } from '@/lib/billing/discount-lookup-client'
import { CancellationControls } from './cancellation-controls'
import { CheckoutSeatPicker } from './checkout-seat-picker'
import { SeatControls } from './seat-controls'
import { StartTrialPanel } from './start-trial-panel'
import { SubscriptionReadout } from './subscription-readout'
import { loadPolarCheckout } from '@/lib/billing/polar-browser'
import { publicConfig, requirePaddlePublicConfig } from '@/lib/publicConfig'

const AWAITING_WEBHOOK_BANNER_MS = 5 * 60 * 1000

type CheckoutSessionResponse = {
  url: string
  expiresAt: string
}

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

function humanizeCheckoutError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('403')) {
      return 'Only admin operators can start checkout.'
    }
    return error.message
  }
  return 'Failed to start checkout.'
}

async function createCheckoutSession(
  projectSlug: string,
): Promise<CheckoutSessionResponse> {
  const res = await fetch(`/api/projects/${projectSlug}/billing/checkout`, {
    method: 'POST',
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: unknown
    } | null
    const message =
      body != null && typeof body.error === 'string'
        ? body.error
        : `Failed to create checkout session (${res.status})`
    throw new Error(message)
  }
  return (await res.json()) as CheckoutSessionResponse
}

export default function ProjectSubscriptionPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>()
  if (!publicConfig.billing) {
    redirect(`/app/projects/${projectSlug}`)
  }
  const { currentOperator } = useProjectContext()
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
  const embedRef = useRef<PolarEmbedCheckout | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [seatQuantity, setSeatQuantity] = useState(1)
  const seatQuantityInitializedRef = useRef(false)
  const [discount, setDiscount] = useState<SubscriptionDiscount | null>(null)

  const minSeats = Math.max(1, data?.usedSeats ?? 1)
  useEffect(() => {
    if (data != null && !seatQuantityInitializedRef.current) {
      seatQuantityInitializedRef.current = true
      setSeatQuantity(Math.max(1, data.usedSeats))
    }
  }, [data])

  const status = data?.subscription?.paddleSubscription?.status ?? null
  const hasPolarSubscription = data?.subscription?.polarSubscription != null
  const isActive =
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due' ||
    status === 'paused'

  useEffect(() => {
    if (isActive && checkoutState.phase === 'open') {
      try {
        embedRef.current?.close()
      } catch (error) {
        console.error('Failed to close Polar checkout', error)
      }
      embedRef.current = null
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
        embedRef.current?.close()
      } catch (error) {
        console.error('Failed to close Polar checkout on expiry', error)
      }
      embedRef.current = null
      setCheckoutState({ phase: 'expired' })
    }, timeoutMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [checkoutState])

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
    let session: CheckoutSessionResponse
    try {
      session = await createCheckoutSession(projectSlug)
    } catch (error) {
      console.error('Failed to create checkout session', error)
      setCheckoutState({
        phase: 'error',
        message: humanizeCheckoutError(error),
      })
      return
    }

    try {
      const PolarEmbedCheckoutCtor = await loadPolarCheckout()
      const embed = await PolarEmbedCheckoutCtor.create(session.url, {
        theme: 'light',
      })
      embedRef.current = embed

      embed.addEventListener('success', () => {
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

      embed.addEventListener('close', () => {
        embedRef.current = null
        setCheckoutState((prev) => {
          if (prev.phase !== 'open' || prev.awaitingWebhook) {
            return prev
          }
          return { phase: 'idle' }
        })
      })

      setCheckoutState({
        phase: 'open',
        expiresAt: new Date(session.expiresAt),
        awaitingWebhook: false,
        completedAt: null,
      })
    } catch (error) {
      console.error('Failed to open Polar checkout', error)
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
      <div className='h-full overflow-y-auto'>
        <div className='mx-auto flex w-full max-w-2xl flex-col gap-6 p-6'>
          <div className='flex flex-col gap-2'>
            <h1 className='text-xl font-semibold'>Subscription active</h1>
            <p className='text-muted-foreground text-sm'>
              Manage your subscription below. Card changes are still handled via
              the &ldquo;Manage subscription&rdquo; link in your latest Paddle
              billing email.
            </p>
          </div>

          <SubscriptionReadout
            paddleSubscription={data.subscription?.paddleSubscription ?? null}
            usedSeats={data.usedSeats}
          />

          {data.subscription?.paddleSubscription != null && (
            <>
              <SeatControls
                projectSlug={projectSlug}
                paddleSubscription={data.subscription.paddleSubscription}
                usedSeats={data.usedSeats}
              />
              <CancellationControls
                projectSlug={projectSlug}
                paddleSubscription={data.subscription.paddleSubscription}
              />
            </>
          )}

          <Button asChild variant='outline' className='self-start'>
            <Link href={`/app/projects/${projectSlug}`}>Back to project</Link>
          </Button>
        </div>
      </div>
    )
  }

  const showStillWaitingBanner =
    checkoutState.phase === 'open' &&
    checkoutState.awaitingWebhook &&
    checkoutState.completedAt != null &&
    now - checkoutState.completedAt.getTime() > AWAITING_WEBHOOK_BANNER_MS

  if (!hasPolarSubscription) {
    return <StartTrialPanel projectSlug={projectSlug} />
  }

  return (
    <div className='h-full overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-3xl flex-col gap-6 p-6'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-xl font-semibold'>Start your subscription</h1>
          <p className='text-muted-foreground text-sm'>
            $5 per human operator per month + VAT. Bots are always free.
          </p>
        </div>

        <SubscriptionReadout
          paddleSubscription={data.subscription?.paddleSubscription ?? null}
          usedSeats={data.usedSeats}
        />

        <CheckoutSeatPicker
          projectSlug={projectSlug}
          priceId={requirePaddlePublicConfig().priceId}
          quantity={seatQuantity}
          onQuantityChange={setSeatQuantity}
          minSeats={minSeats}
          disabled={
            checkoutState.phase !== 'idle' &&
            checkoutState.phase !== 'expired' &&
            checkoutState.phase !== 'error'
          }
          discount={discount}
          onDiscountChange={setDiscount}
        />

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
              {checkoutState.phase === 'issuing'
                ? 'Starting…'
                : 'Start checkout'}
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
              Still waiting for Polar confirmation. Refresh in a moment.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
