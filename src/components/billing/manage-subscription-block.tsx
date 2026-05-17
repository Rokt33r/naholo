'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type PortalState =
  | { phase: 'idle' }
  | { phase: 'opening' }
  | { phase: 'error'; message: string }

type ManageSubscriptionBlockProps = {
  projectSlug: string
  variant?: React.ComponentProps<typeof Button>['variant']
  className?: string
  children?: React.ReactNode
}

export function ManageSubscriptionBlock({
  projectSlug,
  variant = 'outline',
  className,
  children,
}: ManageSubscriptionBlockProps) {
  const [portalState, setPortalState] = useState<PortalState>({ phase: 'idle' })

  const handleClick = async () => {
    setPortalState({ phase: 'opening' })
    try {
      const res = await fetch(`/api/projects/${projectSlug}/billing/portal`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: unknown
        } | null
        const message =
          body != null && typeof body.error === 'string'
            ? body.error
            : `Failed to open billing portal (${res.status})`
        throw new Error(message)
      }
      const { url } = (await res.json()) as { url: string }
      window.open(url, '_blank', 'noopener,noreferrer')
      setPortalState({ phase: 'idle' })
    } catch (error) {
      console.error('Failed to open Polar portal', error)
      setPortalState({
        phase: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to open portal.',
      })
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      <Button
        onClick={handleClick}
        disabled={portalState.phase === 'opening'}
        variant={variant}
        className={className}
      >
        {portalState.phase === 'opening'
          ? 'Opening…'
          : (children ?? 'Manage subscription')}
      </Button>
      {portalState.phase === 'error' && (
        <Alert variant='destructive'>
          <AlertDescription>{portalState.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
