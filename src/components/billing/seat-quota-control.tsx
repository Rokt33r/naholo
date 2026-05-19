'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdateSubscriptionSeats } from '@/hooks/use-active-project-subscription'

type SeatQuotaControlProps = {
  projectSlug: string
  seats: number
  usedSeats: number
}

export function SeatQuotaControl({
  projectSlug,
  seats,
  usedSeats,
}: SeatQuotaControlProps) {
  const [value, setValue] = useState<number>(seats)
  const mutation = useUpdateSubscriptionSeats(projectSlug)

  useEffect(() => {
    setValue(seats)
  }, [seats])

  const handleSave = () => {
    mutation.mutate(value)
  }

  const handleDecrement = () => {
    setValue((v) => Math.max(1, v - 1))
  }

  const handleIncrement = () => {
    setValue((v) => v + 1)
  }

  const dirty = value !== seats
  const belowUsage = value < usedSeats

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-4'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-sm font-medium'>Seats</h2>
        <p className='text-muted-foreground text-sm'>
          {usedSeats} of {seats} seats in use. Adjust the seat count to match
          your project&rsquo;s needs.
        </p>
      </div>
      <div className='flex items-center gap-2'>
        <Button
          size='icon'
          variant='outline'
          onClick={handleDecrement}
          disabled={mutation.isPending || value <= 1}
          aria-label='Decrease seats'
        >
          −
        </Button>
        <Input
          type='number'
          min={1}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next) && next >= 1) {
              setValue(Math.floor(next))
            }
          }}
          className='w-20 text-center'
        />
        <Button
          size='icon'
          variant='outline'
          onClick={handleIncrement}
          disabled={mutation.isPending}
          aria-label='Increase seats'
        >
          +
        </Button>
        <Button
          onClick={handleSave}
          disabled={mutation.isPending || !dirty || belowUsage}
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
      {belowUsage && (
        <Alert variant='destructive'>
          <AlertDescription>
            {usedSeats} operators are active. Remove operators before lowering
            the seat count below {usedSeats}.
          </AlertDescription>
        </Alert>
      )}
      {mutation.error != null && (
        <Alert variant='destructive'>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
