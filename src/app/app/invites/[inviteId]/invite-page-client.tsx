'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createResponseError } from '@/lib/fetcher'

type InvitePageClientProps = {
  inviteId: string
}

export function InvitePageClient({ inviteId }: InvitePageClientProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const handleClaim = async () => {
    setIsPending(true)
    try {
      const response = await fetch(`/api/invites/${inviteId}/claim`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw await createResponseError(response, 'Failed to claim invite')
      }
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to claim invite',
      )
      setIsPending(false)
    }
  }

  return (
    <Button onClick={handleClaim} disabled={isPending}>
      {isPending ? 'Requesting...' : 'Request to join'}
    </Button>
  )
}
