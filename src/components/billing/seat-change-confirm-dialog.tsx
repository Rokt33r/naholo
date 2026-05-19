'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SeatChangeConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromSeats: number
  toSeats: number
  prorationCents: number | null
  onConfirm: () => void
  isPending: boolean
  errorMessage: string | null
}

export function SeatChangeConfirmDialog({
  open,
  onOpenChange,
  fromSeats,
  toSeats,
  prorationCents,
  onConfirm,
  isPending,
  errorMessage,
}: SeatChangeConfirmDialogProps) {
  const delta = toSeats - fromSeats
  const isIncrease = delta > 0

  const title = isIncrease
    ? `Add ${delta} seat${delta === 1 ? '' : 's'}`
    : `Lower to ${toSeats} seat${toSeats === 1 ? '' : 's'}`

  const description = isIncrease
    ? prorationCents != null && prorationCents > 0
      ? `Your card will be charged about ${formatCents(prorationCents)} now for the remainder of this billing period. Future renewals will bill the full ${toSeats}-seat amount.`
      : `Your card will be charged the prorated amount now. Future renewals will bill the full ${toSeats}-seat amount.`
    : `The change applies now. A credit for the unused portion of the removed seat${delta === -1 ? '' : 's'} will appear on your next invoice.`

  const confirmLabel = isPending
    ? isIncrease
      ? 'Charging…'
      : 'Saving…'
    : isIncrease
      ? 'Confirm and charge'
      : 'Confirm change'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {errorMessage != null && (
          <Alert variant='destructive'>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant={isIncrease ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={isPending}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatCents(cents: number): string {
  const dollars = cents / 100
  return `$${dollars.toFixed(2)}`
}
