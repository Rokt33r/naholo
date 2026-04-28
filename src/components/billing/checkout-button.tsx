'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckoutEventNames } from '@paddle/paddle-js'
import { Button } from '@/components/ui/button'
import {
  initializePaddle,
  subscribePaddleEvents,
} from '@/lib/billing/paddle-browser'

type CheckoutButtonProps = {
  projectId: string
  projectSlug: string
  seatQuantity?: number
  children?: React.ReactNode
  className?: string
}

export function CheckoutButton({
  projectId,
  projectSlug,
  seatQuantity = 1,
  children,
  className,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleClick = async () => {
    setLoading(true)
    try {
      const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
      if (priceId == null || priceId === '') {
        throw new Error('NEXT_PUBLIC_PADDLE_PRICE_ID is not set')
      }

      const paddle = await initializePaddle()
      if (paddle == null) {
        throw new Error('Paddle failed to initialize')
      }

      const unsubscribe = subscribePaddleEvents((event) => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          queryClient.invalidateQueries({
            queryKey: ['project-subscription', projectSlug],
          })
        }
        if (
          event.name === CheckoutEventNames.CHECKOUT_COMPLETED ||
          event.name === CheckoutEventNames.CHECKOUT_CLOSED
        ) {
          unsubscribe()
        }
      })

      paddle.Checkout.open({
        items: [{ priceId, quantity: seatQuantity }],
        customData: { projectId },
      })
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} className={className}>
      {children ?? (loading ? 'Opening checkout...' : 'Start subscription')}
    </Button>
  )
}
