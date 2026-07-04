'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClaimProjectInvite } from '@/hooks/use-project-invites'
import { isValidCallsign } from '@/lib/callsign'

type InvitePageClientProps = {
  inviteId: string
  defaultName: string
  defaultCallsign: string
}

export function InvitePageClient({
  inviteId,
  defaultName,
  defaultCallsign,
}: InvitePageClientProps) {
  const router = useRouter()
  const claimInvite = useClaimProjectInvite(inviteId)
  const [name, setName] = useState(defaultName)
  const [callsign, setCallsign] = useState(defaultCallsign)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedCallsign = callsign.trim()
    if (trimmedName === '') {
      setFormError('Name is required')
      return
    }
    if (!isValidCallsign(trimmedCallsign)) {
      setFormError('Callsign may only contain a-z, 0-9, "-" and "."')
      return
    }

    setFormError(null)
    claimInvite.mutate(
      { name: trimmedName, callsign: trimmedCallsign },
      {
        onSuccess: () => {
          router.refresh()
        },
      },
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='flex w-full flex-col gap-3 text-left'
    >
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='invite-name'>Name</Label>
        <Input
          id='invite-name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={claimInvite.isPending}
        />
      </div>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='invite-callsign'>Callsign</Label>
        <Input
          id='invite-callsign'
          value={callsign}
          onChange={(e) => setCallsign(e.target.value.toLowerCase())}
          disabled={claimInvite.isPending}
        />
        <p className='text-muted-foreground text-xs'>
          Only a-z, 0-9, &quot;-&quot; and &quot;.&quot;. How other operators
          will call you in this project.
        </p>
      </div>
      {formError != null && (
        <p className='text-destructive text-xs'>{formError}</p>
      )}
      <Button
        type='submit'
        disabled={
          claimInvite.isPending || name.trim() === '' || callsign.trim() === ''
        }
      >
        {claimInvite.isPending ? 'Requesting...' : 'Request to join'}
      </Button>
    </form>
  )
}
