'use client'

import { useEffect, useState } from 'react'
import { MinusIcon, PlusIcon, TagIcon, XIcon } from 'lucide-react'
import type { Paddle } from '@paddle/paddle-js'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { initializePaddle } from '@/lib/billing/paddle-browser'
import type { SubscriptionDiscount } from '@/lib/billing/discount-lookup-client'
import { CheckoutDiscountInput } from './checkout-discount-input'

type PriceTotals = {
  subtotalLabel: string
  discountLabel: string | null
  taxLabel: string
  totalLabel: string
}

export function CheckoutSeatPicker({
  projectSlug,
  priceId,
  quantity,
  onQuantityChange,
  minSeats,
  disabled,
  discount,
  onDiscountChange,
}: {
  projectSlug: string
  priceId: string
  quantity: number
  onQuantityChange: (next: number) => void
  minSeats: number
  disabled?: boolean
  discount: SubscriptionDiscount | null
  onDiscountChange: (next: SubscriptionDiscount | null) => void
}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null)
  const [totals, setTotals] = useState<PriceTotals | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)
  const discountId = discount?.id ?? null

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
      .PricePreview({
        items: [{ priceId, quantity }],
        ...(discountId != null ? { discountId } : {}),
      })
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
          discountLabel:
            line.discounts.length > 0 ? line.formattedTotals.discount : null,
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
  }, [paddle, priceId, quantity, discountId])

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
      <div className='flex items-center justify-between border-t pt-3'>
        {discount != null ? (
          <div className='flex items-center gap-2 text-sm'>
            <TagIcon className='text-muted-foreground size-5' />
            <span className='font-medium'>{discount.code}</span>
            <span className='text-muted-foreground'>
              — {discount.description}
            </span>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => onDiscountChange(null)}
              disabled={disabled}
              aria-label='Remove discount'
            >
              <XIcon className='size-5' />
            </Button>
          </div>
        ) : (
          <Button
            variant='outline'
            size='sm'
            onClick={() => setDiscountDialogOpen(true)}
            disabled={disabled}
          >
            <TagIcon className='size-5' />
            Add discount code
          </Button>
        )}
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
            {totals.discountLabel != null && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>
                  Discount{discount != null ? ` (${discount.code})` : ''}
                </span>
                <span className='font-medium tabular-nums'>
                  −{totals.discountLabel}
                </span>
              </div>
            )}
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
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add discount code</DialogTitle>
            <DialogDescription>
              Have a coupon? Apply it to see your discounted total before
              checkout.
            </DialogDescription>
          </DialogHeader>
          <CheckoutDiscountInput
            projectSlug={projectSlug}
            onApplied={(next) => {
              onDiscountChange(next)
              setDiscountDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
