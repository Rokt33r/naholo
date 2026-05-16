'use client'

import { useEffect, useState } from 'react'
import { MinusIcon, PlusIcon } from 'lucide-react'
import type { Paddle } from '@paddle/paddle-js'
import { Button } from '@/components/ui/button'
import { initializePaddle } from '@/lib/billing/paddle-browser'

type PriceTotals = {
  subtotalLabel: string
  taxLabel: string
  totalLabel: string
}

export function CheckoutSeatPicker({
  priceId,
  quantity,
  onQuantityChange,
  minSeats,
  disabled,
}: {
  priceId: string
  quantity: number
  onQuantityChange: (next: number) => void
  minSeats: number
  disabled?: boolean
}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [totals, setTotals] = useState<PriceTotals | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    let cancelled = false
    initializePaddle()
      .then((instance) => {
        if (!cancelled && instance != null) {
          setPaddle(instance)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to initialize Paddle for price preview', error)
          setPreviewError('Could not load pricing.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (paddle == null) {
      return
    }
    let cancelled = false
    setPreviewing(true)
    setPreviewError(null)
    paddle
      .PricePreview({ items: [{ priceId, quantity }] })
      .then((res) => {
        if (cancelled) {
          return
        }
        const line = res.data.details.lineItems[0]
        if (line == null) {
          setTotals(null)
          return
        }
        setTotals({
          subtotalLabel: line.formattedTotals.subtotal,
          taxLabel: line.formattedTotals.tax,
          totalLabel: line.formattedTotals.total,
        })
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        console.error('Paddle PricePreview failed', error)
        setPreviewError('Could not load pricing.')
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewing(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [paddle, priceId, quantity])

  const decrement = () => {
    onQuantityChange(Math.max(minSeats, quantity - 1))
  }
  const increment = () => {
    onQuantityChange(quantity + 1)
  }

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-sm font-medium'>Seats</h2>
        <p className='text-muted-foreground text-sm'>
          Pick how many human operators you&rsquo;ll bill for. You can adjust
          later from this page.
        </p>
      </div>
      <div className='flex items-center gap-3'>
        <div className='flex items-center'>
          <Button
            variant='outline'
            size='icon'
            onClick={decrement}
            disabled={disabled || quantity <= minSeats}
            aria-label='Decrease seats'
          >
            <MinusIcon className='size-5' />
          </Button>
          <div className='w-14 text-center text-lg font-medium tabular-nums'>
            {quantity}
          </div>
          <Button
            variant='outline'
            size='icon'
            onClick={increment}
            disabled={disabled}
            aria-label='Increase seats'
          >
            <PlusIcon className='size-5' />
          </Button>
        </div>
        <span className='text-muted-foreground text-xs'>
          Minimum {minSeats}
          {minSeats > 1 ? ' (active human operators)' : ''}
        </span>
      </div>
      <div className='border-t pt-3'>
        {previewError != null ? (
          <p className='text-destructive text-sm'>{previewError}</p>
        ) : totals == null ? (
          <p className='text-muted-foreground text-sm'>
            {previewing ? 'Loading pricing…' : '—'}
          </p>
        ) : (
          <div className='space-y-1 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Subtotal</span>
              <span className='font-medium tabular-nums'>
                {totals.subtotalLabel}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Tax</span>
              <span className='font-medium tabular-nums'>
                {totals.taxLabel}
              </span>
            </div>
            <div className='flex items-center justify-between border-t pt-1'>
              <span className='text-muted-foreground'>Total</span>
              <span className='font-semibold tabular-nums'>
                {totals.totalLabel}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
