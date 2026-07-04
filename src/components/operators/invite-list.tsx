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

  return (
    <div className='flex items-start gap-2 rounded-lg border px-4 py-3 text-sm'>
      <div className='flex-1 min-w-0'>
        <div className='truncate font-medium'>{invite.email}</div>
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <StatusLabel status={invite.status} />
          {invite.claimerUser != null && (
            <span className='truncate'>&middot; {invite.claimerUser.name}</span>
          )}
          <span>
            &middot;{' '}
            {formatDistanceToNow(new Date(invite.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        {invite.claimerUser != null &&
          invite.claimerUser.identifiers.length > 0 && (
            <div className='mt-0.5 flex flex-col text-xs text-muted-foreground'>
              {invite.claimerUser.identifiers.map((identifier, index) => (
                <span key={index} className='truncate'>
                  {identifier.method} &middot; {identifier.label}
                </span>
              ))}
            </div>
          )}
        {invite.status === 'claimed' &&
          invite.name != null &&
          invite.callsign != null &&
          !isEditingRequest && (
            <div className='mt-0.5 flex items-center gap-1 text-xs'>
              <span className='truncate'>
                Requests to join as{' '}
                <span className='font-medium'>{invite.name}</span> &middot;{' '}
                {invite.callsign}
              </span>
              <Button
                size='icon-sm'
                variant='ghost'
                onClick={handleOpenEditRequest}
                title='Edit requested name and callsign'
              >
                <Pencil className='size-3' />
              </Button>
            </div>
          )}
        {isEditingRequest && (
          <form
            onSubmit={handleSaveRequest}
            className='mt-1.5 flex flex-col gap-1.5'
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
                className='h-7 text-xs'
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
                onChange={(e) =>
                  setRequestCallsign(e.target.value.toLowerCase())
                }
                className='h-7 text-xs'
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
          <p className='mt-1 text-xs text-destructive'>
            Callsign taken — edit the requested callsign, then retry.
          </p>
        )}
      </div>
      <div className='flex items-center gap-1 shrink-0'>
        {invite.status === 'claimed' && (
          <>
            <Button
              size='icon-sm'
              variant='ghost'
              onClick={handleAccept}
              disabled={isBusy}
              title='Accept'
            >
              <Check className='size-4' />
            </Button>
            <Button
              size='icon-sm'
              variant='ghost'
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
              size='icon-sm'
              variant='ghost'
              onClick={() => reject(invite.id)}
              disabled={isBusy}
              title='Reject'
            >
              <X className='size-4' />
            </Button>
            <Button
              size='icon-sm'
              variant='ghost'
              onClick={handleCopyLink}
              title='Copy invite link'
            >
              <Copy className='size-4' />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function StatusLabel({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'text-yellow-600',
    claimed: 'text-blue-600',
    accepted: 'text-green-600',
    rejected: 'text-red-600',
  }

  return <span className={colors[status] ?? ''}>{status}</span>
}
