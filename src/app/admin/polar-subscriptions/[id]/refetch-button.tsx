'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function RefetchButton({
  polarSubscriptionRowId,
}: {
  polarSubscriptionRowId: string
}) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    setIsPending(true)
    try {
      const res = await fetch(
        `/api/admin/polar-subscriptions/${polarSubscriptionRowId}/refetch`,
        { method: 'POST' },
      )
      const json = await res.json().catch(() => ({
        ok: false,
        error: 'invalid_response',
      }))
      if (json.ok) {
        toast.success('Refetched from Polar')
        router.refresh()
      } else {
        toast.error(`Refetch failed: ${json.error}`)
      }
    } catch (error) {
      toast.error(
        `Refetch failed: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={handleClick}
      disabled={isPending}
    >
      <RefreshCw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
      Refetch from Polar
    </Button>
  )
}
