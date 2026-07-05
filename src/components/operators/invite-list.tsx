'use client'

import { useState } from 'react'
import { Check, X, Copy, Loader2, Pencil } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useProjectInvites,
  useAcceptProjectInvite,
  useRejectProjectInvite,
  useUpdateProjectInvite,
} from '@/hooks/use-project-invites'
import type { ProjectInvite } from '@/hooks/use-project-invites'
import { isValidCallsign } from '@/lib/callsign'
import { cn } from '@/lib/utils'

type InviteListProps = {
  projectSlug: string
}

export function InviteList({ projectSlug }: InviteListProps) {
  const { invites, isLoading } = useProjectInvites(projectSlug)

  if (isLoading) {
    return (
      <div className='flex justify-center px-4 py-3'>
        <Loader2 className='size-4 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (invites.length === 0) {
    return (
      <div className='px-4 py-3 text-center text-sm text-muted-foreground'>
        No pending invites
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      {invites.map((invite) => (
        <InviteCard key={invite.id} invite={invite} projectSlug={projectSlug} />
      ))}
    </div>
  )
}

function InviteCard({
  invite,
  projectSlug,
}: {
  invite: ProjectInvite
  projectSlug: string
}) {
  const {
    mutate: accept,
    isPending: isAccepting,
    error: acceptError,
  } = useAcceptProjectInvite(projectSlug)
  const isCallsignTaken = acceptError?.code === 'callsign_taken'
  const updateInvite = useUpdateProjectInvite(projectSlug)
  const [isEditingRequest, setIsEditingRequest] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestCallsign, setRequestCallsign] = useState('')

  const handleOpenEditRequest = () => {
    setRequestName(invite.name ?? '')
    setRequestCallsign(invite.callsign ?? '')
    setIsEditingRequest(true)
  }

  const handleAccept = () => {
    accept(invite.id, {
      onError: (error) => {
        // callsign_taken opens the request editor inline; everything else toasts
        if (error.code === 'callsign_taken') {
          handleOpenEditRequest()
        } else {
          toast.error(error.message)
        }
      },
    })
  }

  const trimmedRequestName = requestName.trim()
  const trimmedRequestCallsign = requestCallsign.trim()
  const canSaveRequest =
    trimmedRequestName !== '' && isValidCallsign(trimmedRequestCallsign)

  const handleSaveRequest = (e: React.FormEvent) => {
    e.preventDefault()
    updateInvite.mutate(
      {
        inviteId: invite.id,
        name: trimmedRequestName,
        callsign: trimmedRequestCallsign,
      },
      {
        onSuccess: () => {
          setIsEditingRequest(false)
        },
      },
    )
  }
  const { mutate: reject, isPending: isRejecting } =
    useRejectProjectInvite(projectSlug)
  const isBusy = isAccepting || isRejecting

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/app/invites/${invite.id}`
    await navigator.clipboard.writeText(url)
    toast.success('Invite link copied')
  }

  const showRequestedIdentity =
    invite.status === 'claimed' &&
    invite.name != null &&
    invite.callsign != null &&
    !isEditingRequest

  return (
    <div className='flex flex-col gap-3.5 rounded-xl border bg-card px-5 py-4 text-sm'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex min-w-0 flex-col gap-1.5'>
          <div className='text-[15px] font-semibold leading-tight tracking-tight break-all'>
            {invite.email}
          </div>
          <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
            <StatusLabel status={invite.status} />
            {invite.claimerUser != null && (
              <>
                <span className='text-muted-foreground/50'>&middot;</span>
                <span className='truncate'>{invite.claimerUser.name}</span>
              </>
            )}
            <span className='text-muted-foreground/50'>&middot;</span>
            <span>
              {formatDistanceToNow(new Date(invite.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          {invite.claimerUser != null &&
            invite.claimerUser.identifiers.length > 0 && (
              <div className='flex flex-col gap-0.5 text-xs text-muted-foreground'>
                {invite.claimerUser.identifiers.map((identifier, index) => (
                  <span key={index} className='truncate'>
                    {identifier.method} &middot; {identifier.label}
                  </span>
                ))}
              </div>
            )}
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          {invite.status === 'claimed' && (
            <>
              <Button
                size='icon'
                variant='outline'
                className='text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                onClick={handleAccept}
                disabled={isBusy}
                title='Accept'
              >
                <Check className='size-4' />
              </Button>
              <Button
                size='icon'
                variant='outline'
                className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                onClick={() => reject(invite.id)}
                disabled={isBusy}
                title='Reject'
              >
                <X className='size-4' />
              </Button>
            </>
          )}
          {invite.status === 'pending' && (
            <>
              <Button
                size='icon'
                variant='outline'
                className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                onClick={() => reject(invite.id)}
                disabled={isBusy}
                title='Reject'
              >
                <X className='size-4' />
              </Button>
              <Button
                size='icon'
                variant='outline'
                className='text-muted-foreground'
                onClick={handleCopyLink}
                title='Copy invite link'
              >
                <Copy className='size-4' />
              </Button>
            </>
          )}
        </div>
      </div>

      {showRequestedIdentity && (
        <div className='flex flex-col gap-2.5 border-t pt-3.5'>
          <div className='flex items-center gap-2'>
            <span className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              Requests to join as
            </span>
            <Button
              size='icon-sm'
              variant='ghost'
              className='size-6'
              onClick={handleOpenEditRequest}
              title='Edit requested name and callsign'
            >
              <Pencil className='size-3' />
            </Button>
          </div>
          <div className='flex flex-wrap gap-x-9 gap-y-2'>
            <div className='flex flex-col gap-0.5'>
              <span className='text-[11px] uppercase tracking-wide text-muted-foreground'>
                Name
              </span>
              <span className='text-sm font-medium'>{invite.name}</span>
            </div>
            <div className='flex flex-col gap-0.5'>
              <span className='text-[11px] uppercase tracking-wide text-muted-foreground'>
                Callsign
              </span>
              <span className='font-mono text-sm'>{invite.callsign}</span>
            </div>
          </div>
        </div>
      )}

      {isEditingRequest && (
        <form
          onSubmit={handleSaveRequest}
          className='flex flex-col gap-2.5 border-t pt-3.5'
        >
          <div className='flex flex-col gap-1'>
            <Label
              htmlFor={`invite-request-name-${invite.id}`}
              className='text-xs'
            >
              Name
            </Label>
            <Input
              id={`invite-request-name-${invite.id}`}
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              className='h-8 text-xs'
              disabled={updateInvite.isPending}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <Label
              htmlFor={`invite-request-callsign-${invite.id}`}
              className='text-xs'
            >
              Callsign
            </Label>
            <Input
              id={`invite-request-callsign-${invite.id}`}
              value={requestCallsign}
              onChange={(e) => setRequestCallsign(e.target.value.toLowerCase())}
              className='h-8 font-mono text-xs'
              disabled={updateInvite.isPending}
            />
          </div>
          <div className='flex items-center gap-1'>
            <Button
              type='submit'
              size='sm'
              disabled={!canSaveRequest || updateInvite.isPending}
            >
              {updateInvite.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type='button'
              size='sm'
              variant='ghost'
              onClick={() => setIsEditingRequest(false)}
              disabled={updateInvite.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isCallsignTaken && (
        <p className='text-xs text-destructive'>
          Callsign taken — edit the requested callsign, then retry.
        </p>
      )}
    </div>
  )
}

function StatusLabel({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'text-amber-600',
    claimed: 'text-blue-600',
    accepted: 'text-emerald-600',
    rejected: 'text-red-600',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium capitalize',
        colorMap[status] ?? 'text-muted-foreground',
      )}
    >
      <span className='size-1.5 rounded-full bg-current' />
      {status}
    </span>
  )
}
