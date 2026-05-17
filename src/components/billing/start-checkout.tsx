'use client'

import { useEffect, useState } from 'react'
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
      setCheckoutState({
        phase: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to start checkout.',
      })
    }
  }

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-4'>
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
        className='self-start'
      >
        {checkoutState.phase === 'issuing'
          ? 'Starting…'
          : checkoutState.phase === 'waiting'
            ? 'Waiting for payment…'
            : 'Start checkout'}
      </Button>
    </div>
  )
}
