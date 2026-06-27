'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function TrialExpirationForm({
  userId,
  expiresAt,
}: {
  userId: string
  expiresAt: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(expiresAt.slice(0, 10))
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const parsedDate = parseYmd(value)
  const isValid = parsedDate != null

  const handleSave = async () => {
    if (parsedDate == null) {
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/users/${userId}/trial`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: parsedDate.toISOString() }),
      })
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }
      setOpen(false)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unknown error')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Edit trial expiration</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='trial-expires-at'>Expires (YYYY-MM-DD)</Label>
          <Input
            id='trial-expires-at'
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder='2026-09-20'
            aria-invalid={!isValid}
          />
          {!isValid ? (
            <p className='text-sm text-red-600 dark:text-red-400'>
              Enter a valid date in YYYY-MM-DD format.
            </p>
          ) : null}
          {error != null ? (
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={pending || !isValid}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  // Reject impossible calendar dates (e.g. 2026-02-31) by round-tripping.
  if (date.toISOString().slice(0, 10) !== value) {
    return null
  }
  return date
}
