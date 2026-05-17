'use client'

import { useEffect, useState } from 'react'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  useUpdateSubscriptionSeats,
  type ActiveProjectSubscriptionResponse,
} from '@/hooks/use-active-project-subscription'

type PaddleSubscription = NonNullable<
  NonNullable<
    ActiveProjectSubscriptionResponse['subscription']
  >['paddleSubscription']
>

export function SeatControls({
  projectSlug,
  paddleSubscription,
  usedSeats,
}: {
  projectSlug: string
  paddleSubscription: PaddleSubscription
  usedSeats: number
}) {
  const currentSeats = paddleSubscription.seatQuantity
  const minSeats = Math.max(1, usedSeats)
  const [quantity, setQuantity] = useState(currentSeats)
  const mutation = useUpdateSubscriptionSeats(projectSlug)

  useEffect(() => {
    setQuantity(currentSeats)
  }, [currentSeats])

  const decrement = () => {
    setQuantity((q) => Math.max(minSeats, q - 1))
  }
  const increment = () => {
    setQuantity((q) => q + 1)
  }
  const dirty = quantity !== currentSeats

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-sm font-medium'>Seats</h2>
        <p className='text-muted-foreground text-sm'>
          {usedSeats} of {currentSeats} used. Changes apply immediately and are
          prorated against your current billing period.
        </p>
      </div>
      <div className='flex items-center gap-3'>
        <div className='flex items-center'>
          <Button
            variant='outline'
            size='icon'
            onClick={decrement}
            disabled={quantity <= minSeats || mutation.isPending}
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
            disabled={mutation.isPending}
            aria-label='Increase seats'
          >
            <PlusIcon className='size-5' />
          </Button>
        </div>
        <span className='text-muted-foreground text-xs'>
          Minimum {minSeats} (active human operator{minSeats === 1 ? '' : 's'})
        </span>
      </div>
      {mutation.error != null && (
        <Alert variant='destructive'>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={() => mutation.mutate(quantity)}
        disabled={!dirty || mutation.isPending}
        className='self-start'
      >
        {mutation.isPending ? 'Updating…' : 'Update seats'}
      </Button>
    </div>
  )
}
