'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import type { PolarEmbedCheckout } from '@polar-sh/checkout/embed'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { loadPolarCheckout } from '@/lib/billing/polar-browser'

type TrialCheckoutSession = {
  url: string
  expiresAt: string
}

type TrialState =
  | { phase: 'idle' }
  | { phase: 'issuing' }
  | { phase: 'open'; expiresAt: Date; awaitingWebhook: boolean }
  | { phase: 'error'; message: string }

async function createTrialCheckout(
  projectSlug: string,
): Promise<TrialCheckoutSession> {
  const res = await fetch(`/api/projects/${projectSlug}/billing/trial`, {
    method: 'POST',
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: unknown
    } | null
    const message =
      body != null && typeof body.error === 'string'
        ? body.error
        : `Failed to start trial (${res.status})`
    throw new Error(message)
  }
  return (await res.json()) as TrialCheckoutSession
}

export function StartTrialPanel({ projectSlug }: { projectSlug: string }) {
  const queryClient = useQueryClient()
  const [trialState, setTrialState] = useState<TrialState>({ phase: 'idle' })
  const embedRef = useRef<PolarEmbedCheckout | null>(null)

  useEffect(() => {
    if (trialState.phase !== 'open') {
      return
    }
    const timeoutMs = Math.max(0, trialState.expiresAt.getTime() - Date.now())
    const timer = window.setTimeout(() => {
      try {
        embedRef.current?.close()
      } catch (error) {
        console.error('Failed to close Polar trial checkout on expiry', error)
      }
      embedRef.current = null
      setTrialState({
        phase: 'error',
        message:
          'This trial checkout session has expired. Click the button to start a new one.',
      })
    }, timeoutMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [trialState])

  const handleStartTrial = async () => {
    setTrialState({ phase: 'issuing' })
    let session: TrialCheckoutSession
    try {
      session = await createTrialCheckout(projectSlug)
    } catch (error) {
      console.error('Failed to create trial checkout', error)
      setTrialState({
        phase: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to start trial.',
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
        setTrialState((prev) => {
          if (prev.phase !== 'open') {
            return prev
          }
          return { ...prev, awaitingWebhook: true }
        })
        queryClient.invalidateQueries({
          queryKey: ['active-project-subscription', projectSlug],
        })
      })

      embed.addEventListener('close', () => {
        embedRef.current = null
        setTrialState((prev) => {
          if (prev.phase !== 'open' || prev.awaitingWebhook) {
            return prev
          }
          return { phase: 'idle' }
        })
      })

      setTrialState({
        phase: 'open',
        expiresAt: new Date(session.expiresAt),
        awaitingWebhook: false,
      })
    } catch (error) {
      console.error('Failed to open Polar trial checkout', error)
      setTrialState({
        phase: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to open trial checkout.',
      })
    }
  }

  return (
    <div className='h-full overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-2xl flex-col gap-6 p-6'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-xl font-semibold'>Start your trial</h1>
          <p className='text-muted-foreground text-sm'>
            This project has no subscription yet. Start a 1-month, 1-seat trial
            — no payment method required. Add a second seat to convert to a paid
            plan.
          </p>
        </div>

        <div className='flex flex-col gap-3 rounded-lg border p-4'>
          {trialState.phase === 'error' && (
            <Alert variant='destructive'>
              <AlertDescription>{trialState.message}</AlertDescription>
            </Alert>
          )}
          {trialState.phase === 'open' && trialState.awaitingWebhook ? (
            <p className='text-muted-foreground text-sm'>
              Finalizing trial — this usually takes a few seconds…
            </p>
          ) : (
            <Button
              onClick={handleStartTrial}
              disabled={
                trialState.phase === 'issuing' || trialState.phase === 'open'
              }
              className='self-start'
            >
              {trialState.phase === 'issuing'
                ? 'Starting trial…'
                : trialState.phase === 'open'
                  ? 'Trial checkout open'
                  : 'Start trial'}
            </Button>
          )}
        </div>

        <Button asChild variant='outline' className='self-start'>
          <Link href={`/app/projects/${projectSlug}`}>Back to project</Link>
        </Button>
      </div>
    </div>
  )
}
