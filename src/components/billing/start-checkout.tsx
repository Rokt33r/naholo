'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type CheckoutState =
  | { phase: 'idle' }
  | { phase: 'issuing' }
  | { phase: 'waiting' }
  | { phase: 'error'; message: string }

type CheckoutSessionResponse = {
  url: string
  expiresAt: string
}

class SubscriptionAlreadyActiveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubscriptionAlreadyActiveError'
  }
}

async function createCheckoutSession(
  projectSlug: string,
): Promise<CheckoutSessionResponse> {
  const res = await fetch(`/api/projects/${projectSlug}/billing/checkout`, {
    method: 'POST',
  })
  if (!res.ok) {
    // TODO normalize api error throw/handling so we don't have to improvise everytime handling errors.
    const body = (await res.json().catch(() => null)) as {
      error?: unknown
      message?: unknown
    } | null
    const messageField =
      body != null && typeof body.message === 'string'
        ? body.message
        : body != null && typeof body.error === 'string'
          ? body.error
          : `Failed to create checkout session (${res.status})`
    if (
      res.status === 409 &&
      body != null &&
      body.error === 'subscription_already_active'
    ) {
      throw new SubscriptionAlreadyActiveError(messageField)
    }
    throw new Error(messageField)
  }
  return (await res.json()) as CheckoutSessionResponse
}

type StartCheckoutProps = {
  projectSlug: string
  onWaitingChange?: (waiting: boolean) => void
}

export function StartCheckout({
  projectSlug,
  onWaitingChange,
}: StartCheckoutProps) {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    phase: 'idle',
  })
  const queryClient = useQueryClient()

  useEffect(() => {
    onWaitingChange?.(checkoutState.phase === 'waiting')
  }, [checkoutState.phase, onWaitingChange])

  const handleStartCheckout = async () => {
    setCheckoutState({ phase: 'issuing' })
    try {
      const session = await createCheckoutSession(projectSlug)
      window.open(session.url, '_blank', 'noopener,noreferrer')
      setCheckoutState({ phase: 'waiting' })
    } catch (error) {
      console.error('Failed to start checkout', error)
      if (error instanceof SubscriptionAlreadyActiveError) {
        queryClient.invalidateQueries({
          queryKey: ['active-project-subscription', projectSlug],
        })
        return
      }
      setCheckoutState({
        phase: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to start checkout.',
      })
    }
  }

  return (
    <div className='flex h-full flex-col gap-3 rounded-lg border p-4'>
      <div className='flex flex-col gap-1'>
        <h4 className='text-sm font-semibold'>Subscribe</h4>
        <p className='text-muted-foreground text-sm'>
          $5 per operator per month + VAT. Add teammates and scale seats
          anytime.
        </p>
      </div>
      {checkoutState.phase === 'error' && (
        <Alert variant='destructive'>
          <AlertDescription>{checkoutState.message}</AlertDescription>
        </Alert>
      )}
      {checkoutState.phase === 'waiting' && (
        <Alert>
          <AlertDescription>
            Checkout opened in a new tab. This page will update once payment
            completes.
          </AlertDescription>
        </Alert>
      )}
      <Button
        onClick={handleStartCheckout}
        disabled={
          checkoutState.phase === 'issuing' || checkoutState.phase === 'waiting'
        }
        className='mt-auto self-start'
      >
        {checkoutState.phase === 'issuing'
          ? 'Starting…'
          : checkoutState.phase === 'waiting'
            ? 'Waiting for payment…'
            : 'Subscribe now'}
      </Button>
    </div>
  )
}
