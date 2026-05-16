'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  lookupSubscriptionDiscount,
  type SubscriptionDiscount,
} from '@/lib/billing/discount-lookup-client'

export function CheckoutDiscountInput({
  projectSlug,
  onApplied,
}: {
  projectSlug: string
  onApplied: (discount: SubscriptionDiscount) => void
}) {
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleApply = async () => {
    const trimmedCode = code.trim()
    if (trimmedCode === '') {
      return
    }
    setPending(true)
    setErrorMessage(null)
    try {
      const next = await lookupSubscriptionDiscount(projectSlug, trimmedCode)
      onApplied(next)
      setCode('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lookup failed.'
      setErrorMessage(
        message === 'not_found'
          ? "We couldn't find an active discount with that code."
          : message,
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex gap-2'>
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder='Enter code'
          maxLength={32}
          disabled={pending}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleApply()
            }
          }}
        />
        <Button onClick={handleApply} disabled={pending || code.trim() === ''}>
          {pending ? 'Checking…' : 'Apply'}
        </Button>
      </div>
      {errorMessage != null && (
        <Alert variant='destructive'>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
