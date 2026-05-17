'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type TrialState =
  | { phase: 'idle' }
  | { phase: 'provisioning' }
  | { phase: 'error'; message: string }

async function provisionTrial(projectSlug: string): Promise<void> {
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
}

export function StartTrialPanel({ projectSlug }: { projectSlug: string }) {
  const queryClient = useQueryClient()
  const [trialState, setTrialState] = useState<TrialState>({ phase: 'idle' })

  const handleStartTrial = async () => {
    setTrialState({ phase: 'provisioning' })
    try {
      await provisionTrial(projectSlug)
      await queryClient.invalidateQueries({
        queryKey: ['active-project-subscription', projectSlug],
      })
      setTrialState({ phase: 'idle' })
    } catch (error) {
      console.error('Failed to provision trial', error)
      setTrialState({
        phase: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to start trial.',
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
          <Button
            onClick={handleStartTrial}
            disabled={trialState.phase === 'provisioning'}
            className='self-start'
          >
            {trialState.phase === 'provisioning'
              ? 'Starting trial…'
              : 'Start trial'}
          </Button>
        </div>

        <Button asChild variant='outline' className='self-start'>
          <Link href={`/app/projects/${projectSlug}`}>Back to project</Link>
        </Button>
      </div>
    </div>
  )
}
