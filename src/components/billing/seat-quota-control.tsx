'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SeatChangeConfirmDialog } from '@/components/billing/seat-change-confirm-dialog'
import { useUpdateSubscriptionSeats } from '@/hooks/use-active-project-subscription'
import {
  computeProrationCents,
  formatSeatPriceCopy,
} from '@/lib/billing-pricing'

type SeatQuotaControlProps = {
  projectSlug: string
  seats: number
  usedSeats: number
  isSeatExhausted: boolean
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
}

export function SeatQuotaControl({
  projectSlug,
  seats,
  usedSeats,
  isSeatExhausted,
  currentPeriodStart,
  currentPeriodEnd,
}: SeatQuotaControlProps) {
  const [value, setValue] = useState<number>(seats)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const mutation = useUpdateSubscriptionSeats(projectSlug)

  useEffect(() => {
    setValue(seats)
  }, [seats])

  const valueHasChanged = value !== seats
  const belowUsage = value < usedSeats
  const isIncrease = value > seats

  const prorationCents = useMemo(() => {
    if (!isIncrease) {
      return null
    }
    return computeProrationCents({
      deltaSeats: value - seats,
      currentPeriodStart,
      currentPeriodEnd,
      now: new Date(),
    })
  }, [isIncrease, value, seats, currentPeriodStart, currentPeriodEnd])

  const handleDecrement = () => {
    setValue((v) => Math.max(1, v - 1))
  }

  const handleIncrement = () => {
    setValue((v) => v + 1)
  }

  const handleOpenConfirm = () => {
    if (!valueHasChanged || belowUsage) {
      return
    }
    setErrorMessage(null)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    setErrorMessage(null)
    mutation.mutate(value, {
      onSuccess: () => {
        setConfirmOpen(false)
      },
      onError: (error) => {
        setErrorMessage(error.message)
      },
    })
  }

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) {
      return
    }
    if (!next) {
      setErrorMessage(null)
    }
    setConfirmOpen(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seats</CardTitle>
        <CardDescription>
          {formatSeatPriceCopy()} {usedSeats} of {seats} seats in use.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {isSeatExhausted && (
          <Alert>
            <AlertDescription>
              Seat quota reached. Raise the seat count to add more operators.
            </AlertDescription>
          </Alert>
        )}
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
            onClick={handleOpenConfirm}
            disabled={mutation.isPending || !valueHasChanged || belowUsage}
          >
            Save
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
        <SeatChangeConfirmDialog
          open={confirmOpen}
          onOpenChange={handleOpenChange}
          fromSeats={seats}
          toSeats={value}
          prorationCents={prorationCents}
          onConfirm={handleConfirm}
          isPending={mutation.isPending}
          errorMessage={errorMessage}
        />
      </CardContent>
    </Card>
  )
}
